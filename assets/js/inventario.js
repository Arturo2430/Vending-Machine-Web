/* ============================================================
   SAID · Inventario y reposición
   GET  /api/slots
   POST /api/slots/restock        {slot, added_qty, request_id}
   POST /api/slots/{id}/product   {product_id}
   POST /api/products             {name, cost}

   Regla del proyecto: el formulario pide el TOTAL FINAL (lo que queda
   físicamente). added_qty se calcula contra el stock que reportó el ESP32.
   El request_id se guarda por canal: si se recarga la página, se reutiliza
   el mismo identificador y no se crea una segunda reposición (prueba Q12).
   ============================================================ */
(function () {
  'use strict';
  if (!UI.iniciarPagina()) return;

  var cajaCanales = document.getElementById('canales');
  var avisoModo = document.getElementById('avisoModo');
  var canales = [];
  var catalogo = [];
  var enMantenimiento = false;

  /* ---------- request_id pendiente por canal ---------- */
  function idPendiente(slot) {
    var clave = 'said_restock_' + slot;
    var guardado = sessionStorage.getItem(clave);
    if (guardado) return guardado;
    var nuevo = UI.idPeticion('rep');
    sessionStorage.setItem(clave, nuevo);
    return nuevo;
  }
  function limpiarPendiente(slot) { sessionStorage.removeItem('said_restock_' + slot); }

  /* ---------- pintado ---------- */
  function pintar() {
    cajaCanales.innerHTML = canales.map(function (c) {
      var cap = c.capacity || 4;
      var porcentaje = Math.round((c.stock / cap) * 100);
      var etiqueta = c.stock === 0
        ? '<span class="etq etq--falla">Sin stock</span>'
        : (c.stock < cap ? '<span class="etq">Espacio libre</span>' : '<span class="etq etq--activa">Lleno</span>');
      return '<article class="hoja">' +
        '<div class="canal__cabeza"><span class="canal__num">Canal ' + c.id + '</span>' + etiqueta + '</div>' +
        '<h3 class="canal__producto">' + UI.escapar(c.product || 'Sin asignar') + '</h3>' +
        '<p class="canal__precio">' + UI.dinero(c.price) + '</p>' +
        '<div class="barra-stock"><span style="width:' + porcentaje + '%"></span></div>' +
        '<p class="canal__stock">' + c.stock + ' de ' + cap + ' unidades · versión ' + (c.version || 1) + '</p>' +
        '<div class="acciones">' +
          '<button class="btn btn--chico" data-reponer="' + c.id + '">Reponer</button>' +
          '<button class="btn btn--claro btn--chico" data-producto="' + c.id + '">Cambiar producto</button>' +
        '</div></article>';
    }).join('');

    cajaCanales.querySelectorAll('[data-reponer]').forEach(function (b) {
      b.addEventListener('click', function () { modalReposicion(Number(b.dataset.reponer)); });
    });
    cajaCanales.querySelectorAll('[data-producto]').forEach(function (b) {
      b.addEventListener('click', function () { modalProducto(Number(b.dataset.producto)); });
    });
  }

  function pintarModo() {
    avisoModo.innerHTML = enMantenimiento
      ? '<div class="aviso aviso--ok"><p class="aviso__titulo">Mantenimiento abierto</p>' +
        '<p style="margin:0">Puedes reponer canales y cambiar productos.</p></div>'
      : '<div class="aviso aviso--ocupado"><p class="aviso__titulo">La máquina está en operación</p>' +
        '<p style="margin:0">Abre el mantenimiento desde el tablero de estado antes de reponer. ' +
        'Si el teclado ya lo tiene, el ESP32 responde ocupado (409).</p></div>';
  }

  /* ---------- carga ---------- */
  async function cargar() {
    try {
      var estado = await API.llamarApi('/api/status');
      enMantenimiento = estado.mode === 'maintenance';
      pintarModo();
    } catch (e) { enMantenimiento = false; pintarModo(); }

    try {
      canales = await API.llamarApi('/api/slots');
      UI.limpiarAviso();
      pintar();
    } catch (err) {
      UI.mostrarError(err);
      cajaCanales.innerHTML = '<article class="hoja"><p class="vacio">No se pudo leer el inventario.</p></article>';
    }

    try { catalogo = await API.llamarApi('/api/products'); } catch (e) { catalogo = []; }
  }

  /* ---------- reposición ---------- */
  function modalReposicion(slot) {
    var canal = canales.filter(function (c) { return c.id === slot; })[0];
    if (!canal) return;
    var cap = canal.capacity || 4;
    var peticion = idPendiente(slot);

    var capa = UI.abrirModal(
      '<h3>Reponer canal ' + slot + '</h3>' +
      '<p class="modal__nota">Cuenta las unidades que quedan dentro del canal y captura ese total.</p>' +
      '<div data-aviso-modal></div>' +
      '<div class="campo"><label for="totalFinal">Total final de unidades (0 a ' + cap + ')</label>' +
      '<input id="totalFinal" type="number" min="0" max="' + cap + '" step="1" value="' + cap + '">' +
      '<p class="ayuda">Actualmente el ESP32 reporta ' + canal.stock + '.</p></div>' +
      '<div class="campo"><label for="nuevoPrecio">Precio en pesos (opcional)</label>' +
      '<input id="nuevoPrecio" type="number" min="1" step="0.5" placeholder="' + (canal.price / 100).toFixed(2) + '">' +
      '<p class="ayuda">Déjalo vacío para conservar ' + UI.dinero(canal.price) + '.</p></div>' +
      '<div class="resumen" id="resumen"></div>' +
      '<div class="acciones"><button class="btn" id="confirmar">Confirmar reposición</button>' +
      '<button class="btn btn--claro" id="cancelar">Cancelar</button></div>'
    );

    var total = capa.querySelector('#totalFinal');
    var precio = capa.querySelector('#nuevoPrecio');
    var resumen = capa.querySelector('#resumen');

    function pintarResumen() {
      var t = Number(total.value);
      var agrega = t - canal.stock;
      resumen.innerHTML =
        '<div><span>Canal</span><span>' + slot + ' · ' + UI.escapar(canal.product) + '</span></div>' +
        '<div><span>Stock actual</span><span>' + canal.stock + '</span></div>' +
        '<div><span>Total final</span><span>' + (isNaN(t) ? '—' : t) + '</span></div>' +
        '<div><span>Se agregan</span><span>' + (isNaN(agrega) ? '—' : agrega) + '</span></div>' +
        '<div><span>Precio</span><span>' + (precio.value ? '$' + Number(precio.value).toFixed(2) : UI.dinero(canal.price)) + '</span></div>' +
        '<div><span>request_id</span><span>' + peticion + '</span></div>';
    }
    total.addEventListener('input', pintarResumen);
    precio.addEventListener('input', pintarResumen);
    pintarResumen();

    capa.querySelector('#cancelar').addEventListener('click', UI.cerrarModal);
    capa.querySelector('#confirmar').addEventListener('click', async function () {
      var t = Number(total.value);
      if (!(t >= 0) || t > cap || t % 1 !== 0) {
        UI.aviso('error', 'Total final inválido', 'Captura un número entero entre 0 y ' + cap + '.', null, '[data-aviso-modal]');
        return;
      }
      if (t < canal.stock) {
        UI.aviso('error', 'El total no puede bajar aquí',
          'La reposición solo agrega unidades. Para corregir un faltante, regístralo como falla con QA.',
          null, '[data-aviso-modal]');
        return;
      }
      this.disabled = true;
      this.textContent = 'Enviando…';
      var cuerpo = { slot: slot, added_qty: t - canal.stock, request_id: peticion };
      if (precio.value) cuerpo.price = Math.round(Number(precio.value) * 100);
      try {
        var r = await API.llamarApi('/api/slots/restock', 'POST', cuerpo);
        limpiarPendiente(slot);
        UI.cerrarModal();
        UI.exito('Reposición guardada',
          'El canal ' + slot + ' quedó con ' + r.new_stock + ' unidades según el ESP32.',
          'request_id: ' + peticion);
        cargar();
      } catch (err) {
        UI.mostrarError(err, '[data-aviso-modal]');
        // El request_id NO se borra: si se reintenta, el ESP32 devuelve el mismo resultado.
        var b = capa.querySelector('#confirmar');
        b.disabled = false; b.textContent = 'Reintentar con el mismo request_id';
      }
    });
  }

  /* ---------- cambio de producto ---------- */
  function modalProducto(slot) {
    var canal = canales.filter(function (c) { return c.id === slot; })[0];
    var opciones = catalogo.map(function (p) {
      return '<option value="' + p.id + '">' + UI.escapar(p.name) + ' · ' + UI.dinero(p.cost) + '</option>';
    }).join('');

    var capa = UI.abrirModal(
      '<h3>Producto del canal ' + slot + '</h3>' +
      '<p class="modal__nota">Solo se permite durante el mantenimiento. Actualmente: ' + UI.escapar(canal.product) + '.</p>' +
      '<div data-aviso-modal></div>' +
      '<div class="campo"><label for="prod">Producto del catálogo</label>' +
      '<select id="prod">' + (opciones || '<option value="">Catálogo vacío</option>') + '</select></div>' +
      '<div class="acciones"><button class="btn" id="guardarProd">Guardar producto</button>' +
      '<button class="btn btn--claro" id="cancelarProd">Cancelar</button></div>'
    );

    capa.querySelector('#cancelarProd').addEventListener('click', UI.cerrarModal);
    capa.querySelector('#guardarProd').addEventListener('click', async function () {
      var id = capa.querySelector('#prod').value;
      if (!id) { UI.aviso('error', 'Sin producto', 'Agrega antes un producto al catálogo.', null, '[data-aviso-modal]'); return; }
      this.disabled = true;
      try {
        await API.llamarApi('/api/slots/' + slot + '/product', 'POST', { product_id: Number(id) });
        UI.cerrarModal();
        UI.exito('Producto actualizado', 'El canal ' + slot + ' cambió de producto.');
        cargar();
      } catch (err) {
        UI.mostrarError(err, '[data-aviso-modal]');
        this.disabled = false;
      }
    });
  }

  /* ---------- catálogo ---------- */
  document.getElementById('formProducto').addEventListener('submit', async function (e) {
    e.preventDefault();
    var nombre = document.getElementById('nombreProd');
    var costo = document.getElementById('costoProd');
    UI.limpiarAviso();
    if (!nombre.value.trim() || !(Number(costo.value) > 0)) {
      UI.aviso('error', 'Datos incompletos', 'Captura el nombre y un precio mayor que cero.');
      return;
    }
    try {
      var r = await API.llamarApi('/api/products', 'POST', {
        name: nombre.value.trim(),
        cost: Math.round(Number(costo.value) * 100)
      });
      UI.exito('Producto agregado', nombre.value.trim() + ' ya está en el catálogo.', 'product_id: ' + r.product_id);
      nombre.value = ''; costo.value = '';
      catalogo = await API.llamarApi('/api/products');
    } catch (err) { UI.mostrarError(err); }
  });

  document.getElementById('btnRecargar').addEventListener('click', cargar);
  cargar();
})();
