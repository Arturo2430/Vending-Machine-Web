/* ============================================================
   SAID · Capa cliente HTTP
   Una sola función para hablar con el ESP32: llamarApi(ruta, metodo, datos)
   Mientras el firmware no tenga las rutas, API.usarMock = true responde
   con los datos de prueba de mock.js.
   ============================================================ */

window.API = (function () {
  'use strict';

  var API = {
    base: '',            // vacío = mismo origen (http://192.168.4.1)
    usarMock: false,      // <-- poner en false cuando el ESP32 sirva las rutas
    retardoMock: 260     // ms, para ver los estados de "cargando"
  };

  /* ---------- error homogéneo del contrato ---------- */
  function ErrorApi(http, cuerpo) {
    this.http = http;
    this.code = (cuerpo && cuerpo.code) || codigoPorDefecto(http);
    this.message = (cuerpo && cuerpo.message) || mensajePorDefecto(http);
    this.request_id = (cuerpo && cuerpo.request_id) || null;
  }
  ErrorApi.prototype = Object.create(Error.prototype);

  function codigoPorDefecto(http) {
    return ({
      400: 'DATO_INVALIDO', 401: 'SIN_SESION', 403: 'SIN_PERMISO',
      404: 'NO_EXISTE', 409: 'OCUPADO', 503: 'FALLA_INTERNA'
    })[http] || 'ERROR_' + http;
  }
  function mensajePorDefecto(http) {
    return ({
      400: 'Revisa los datos enviados: alguno no es válido.',
      401: 'La sesión no está activa. Inicia sesión otra vez.',
      403: 'Esta cuenta no tiene permiso para esa operación.',
      404: 'El recurso solicitado no existe.',
      409: 'La máquina está ocupada o el dato cambió. Vuelve a consultar antes de reintentar.',
      503: 'El ESP32 no pudo completar la operación. Intenta de nuevo en unos segundos.',
      0:   'No hay respuesta del ESP32. Revisa que sigas conectado a su red WiFi.'
    })[http] || 'Error inesperado (' + http + ').';
  }

  /* ---------- sesión ---------- */
  function token() { return sessionStorage.getItem('said_token') || ''; }

  /* ---------- llamada genérica ---------- */
  async function llamarApi(ruta, metodo, datos) {
    metodo = metodo || 'GET';
    if (API.usarMock) return responderMock(ruta, metodo, datos);

    var opciones = { method: metodo, headers: {} };
    if (token()) opciones.headers['Authorization'] = 'Bearer ' + token();
    if (datos) {
      opciones.headers['Content-Type'] = 'application/json';
      opciones.body = JSON.stringify(datos);
    }

    var respuesta;
    try {
      respuesta = await fetch(API.base + ruta, opciones);
    } catch (e) {
      throw new ErrorApi(0, null);          // sin red: no se inventa resultado
    }

    var tipo = respuesta.headers.get('Content-Type') || '';
    if (tipo.indexOf('application/json') === -1) {
      if (!respuesta.ok) throw new ErrorApi(respuesta.status, null);
      return respuesta;                      // p. ej. /api/backup (archivo)
    }

    var cuerpo = await respuesta.json().catch(function () { return null; });
    if (!respuesta.ok) throw new ErrorApi(respuesta.status, cuerpo);
    return cuerpo;
  }

  /* ============================================================
     Respuestas simuladas (solo con API.usarMock = true)
     ============================================================ */
  var idempotentes = {};   // request_id -> respuesta ya entregada (regla Q12)

  function responderMock(ruta, metodo, datos) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try { resolve(resolverMock(ruta, metodo, datos || {})); }
        catch (e) { reject(e); }
      }, API.retardoMock);
    });
  }

  function resolverMock(ruta, metodo, datos) {
    var M = window.MOCK;
    var guardar = function (r) { if (M.guardar) M.guardar(); return r; };
    var sinQuery = ruta.split('?')[0];

    if (sinQuery === '/api/login' && metodo === 'POST') {
      if (String(datos.pin || '') !== M.pin) throw new ErrorApi(401, {
        code: 'PIN_INCORRECTO',
        message: 'El PIN administrativo no coincide. Inténtalo de nuevo.',
        request_id: 'req_login_' + Date.now()
      });
      return { success: true, token: 'demo-' + Date.now(), user: 'admin' };
    }

    if (sinQuery === '/api/logout') return { success: true };

    if (sinQuery === '/api/status') return JSON.parse(JSON.stringify(M.estado));

    if (sinQuery === '/api/slots' && metodo === 'GET') {
      return JSON.parse(JSON.stringify(M.slots));
    }

    if (sinQuery === '/api/products' && metodo === 'GET') {
      return JSON.parse(JSON.stringify(M.productos));
    }

    if (sinQuery === '/api/products' && metodo === 'POST') {
      if (!datos.name || !(datos.cost > 0)) throw new ErrorApi(400, {
        code: 'DATO_INVALIDO', message: 'Nombre y costo son obligatorios.'
      });
      var nuevo = { id: M.productos.length + 1, name: datos.name, cost: datos.cost };
      M.productos.push(nuevo);
      return guardar({ success: true, product_id: nuevo.id });
    }

    if (sinQuery === '/api/slots/restock' && metodo === 'POST') {
      if (idempotentes[datos.request_id]) return idempotentes[datos.request_id];
      if (M.estado.mode !== 'maintenance') throw new ErrorApi(409, {
        code: 'OCUPADO',
        message: 'La máquina no está en mantenimiento. Inícialo desde el tablero antes de reponer.',
        request_id: datos.request_id
      });
      var canal = M.slots.filter(function (s) { return s.id === Number(datos.slot); })[0];
      if (!canal) throw new ErrorApi(404, { code: 'NO_EXISTE', message: 'Ese canal no existe.' });
      var agregadas = Number(datos.added_qty);
      if (!(agregadas >= 0) || canal.stock + agregadas > canal.capacity) {
        throw new ErrorApi(400, {
          code: 'DATO_INVALIDO',
          message: 'El total final debe estar entre 0 y ' + canal.capacity + ' unidades.',
          request_id: datos.request_id
        });
      }
      canal.stock = canal.stock + agregadas;
      canal.version++;
      if (datos.price) canal.price = Number(datos.price);
      var r = { success: true, new_stock: canal.stock, request_id: datos.request_id };
      idempotentes[datos.request_id] = r;
      return guardar(r);
    }

    if (/^\/api\/slots\/\d+\/product$/.test(sinQuery) && metodo === 'POST') {
      var idCanal = Number(sinQuery.split('/')[3]);
      var c = M.slots.filter(function (s) { return s.id === idCanal; })[0];
      if (!c) throw new ErrorApi(404, { code: 'NO_EXISTE', message: 'Ese canal no existe.' });
      if (M.estado.mode !== 'maintenance') throw new ErrorApi(409, {
        code: 'OCUPADO', message: 'Solo se puede cambiar el producto durante el mantenimiento.'
      });
      var p = M.productos.filter(function (x) { return x.id === Number(datos.product_id); })[0];
      if (!p) throw new ErrorApi(400, { code: 'DATO_INVALIDO', message: 'Selecciona un producto del catálogo.' });
      c.product = p.name; c.price = p.cost; c.version++;
      return guardar({ success: true });
    }

    if (sinQuery === '/api/maintenance/start') {
      if (M.estado.mode === 'maintenance') throw new ErrorApi(409, {
        code: 'OCUPADO', message: 'Otra sesión (teclado o web) ya tiene el mantenimiento abierto.'
      });
      M.estado.mode = 'maintenance'; M.estado.state = 'RESTOCK';
      return guardar({ success: true, mode: 'maintenance' });
    }
    if (sinQuery === '/api/maintenance/end') {
      M.estado.mode = 'operation'; M.estado.state = 'REPOSO';
      return guardar({ success: true, mode: 'operation' });
    }

    if (sinQuery === '/api/cards' && metodo === 'GET') {
      return JSON.parse(JSON.stringify(M.cards));
    }

    if (sinQuery === '/api/cards/recharge' && metodo === 'POST') {
      if (idempotentes[datos.request_id]) return idempotentes[datos.request_id];
      var t = M.cards.filter(function (x) { return x.uid === datos.uid; })[0];
      if (!t) throw new ErrorApi(404, { code: 'NO_EXISTE', message: 'Esa tarjeta no está registrada.' });
      if (!t.active) throw new ErrorApi(403, {
        code: 'SIN_PERMISO', message: 'La tarjeta está deshabilitada; no admite recargas.',
        request_id: datos.request_id
      });
      var monto = Number(datos.amount);
      if (!(monto > 0)) throw new ErrorApi(400, { code: 'DATO_INVALIDO', message: 'El monto debe ser mayor que cero.' });
      t.balance += monto;
      M.transactions.unshift({
        id: 1001 + M.transactions.length, type: 'RECHARGE', slot: null, product: null,
        uid: t.uid, amount: monto, result: 'OK', date: '2026-09-17T11:05:00'
      });
      var res = { success: true, new_balance: t.balance, request_id: datos.request_id };
      idempotentes[datos.request_id] = res;
      return guardar(res);
    }

    if (sinQuery === '/api/reports/transactions' || sinQuery === '/api/transactions') {
      var q = new URLSearchParams(ruta.split('?')[1] || '');
      var pagina = Number(q.get('page') || 1);
      var limite = Number(q.get('limit') || 10);
      var tipo = q.get('type') || '';
      var datosFiltrados = M.transactions.filter(function (x) { return !tipo || x.type === tipo; });
      var total = Math.max(1, Math.ceil(datosFiltrados.length / limite));
      return {
        page: pagina,
        total_pages: total,
        total_items: datosFiltrados.length,
        data: datosFiltrados.slice((pagina - 1) * limite, pagina * limite)
      };
    }

    if (sinQuery === '/api/backup') {
      var contenido = 'SQLite format 3 (archivo de demostración generado por el mock)';
      return new Blob([contenido], { type: 'application/octet-stream' });
    }

    throw new ErrorApi(404, { code: 'NO_EXISTE', message: 'Ruta no contemplada en los datos de prueba: ' + ruta });
  }

  API.llamarApi = llamarApi;
  API.ErrorApi = ErrorApi;
  return API;
})();

window.llamarApi = window.API.llamarApi;
