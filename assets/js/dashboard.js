/* ============================================================
   SAID · Tablero de estado
   GET  /api/status
   POST /api/maintenance/start · /api/maintenance/end
   GET  /api/backup
   ============================================================ */
(function () {
  'use strict';
  if (!UI.iniciarPagina()) return;

  var contenedor = document.getElementById('tarjetasEstado');
  var cajaMant = document.getElementById('cajaMantenimiento');
  var btnIniciar = document.getElementById('btnIniciarMant');
  var btnTerminar = document.getElementById('btnTerminarMant');
  var btnRespaldo = document.getElementById('btnRespaldo');
  var cajaRespaldo = document.getElementById('cajaRespaldo');
  var ultima = document.getElementById('ultimaConsulta');
  var temporizador = null;

  function tarjeta(rotulo, valor, pie, tono) {
    return '<article class="hoja estado ' + (tono ? 'estado--' + tono : '') + '">' +
             '<p class="estado__rotulo">' + UI.escapar(rotulo) + '</p>' +
             '<p class="estado__valor">' + UI.escapar(valor) + '</p>' +
             '<p class="estado__pie">' + UI.escapar(pie) + '</p>' +
           '</article>';
  }

  function pintar(e) {
    var puertaAbierta = e.door === 'open';
    var barreraBloqueada = e.barrier === 'blocked';
    var mantenimiento = e.mode === 'maintenance';

    contenedor.innerHTML =
      tarjeta('Estado del sistema', e.state || '—',
              e.status === 'ok' ? 'Operación normal' : 'Revisión necesaria',
              e.status === 'ok' ? 'ok' : 'malo') +
      tarjeta('Puerta', puertaAbierta ? 'Abierta' : 'Cerrada',
              puertaAbierta ? 'No se puede vender con la puerta abierta' : 'Gabinete asegurado',
              puertaAbierta ? 'aviso' : 'ok') +
      tarjeta('Barrera óptica', barreraBloqueada ? 'Bloqueada' : 'Libre',
              barreraBloqueada ? 'Hay un producto o un objeto en la rampa' : 'Rampa despejada',
              barreraBloqueada ? 'aviso' : 'ok') +
      tarjeta('Modo', mantenimiento ? 'Mantenimiento' : 'Operación',
              mantenimiento ? 'Las ventas están detenidas' : 'La máquina puede vender',
              mantenimiento ? 'aviso' : 'ok');

    btnIniciar.disabled = mantenimiento;
    btnTerminar.disabled = !mantenimiento;

    var pendiente = e.pending_restock;
    cajaMant.innerHTML = pendiente
      ? '<div class="aviso aviso--ocupado"><p class="aviso__titulo">Reposición pendiente en el canal ' +
        UI.escapar(pendiente.slot) + '</p><p style="margin:0">Se conserva hasta que el ESP32 la cierre. ' +
        'No se crea otra operación aunque recargues la página.</p>' +
        '<p class="aviso__meta">request_id: ' + UI.escapar(pendiente.request_id) + '</p></div>'
      : '<div class="aviso aviso--info"><p class="aviso__titulo">' +
        (mantenimiento ? 'Mantenimiento abierto por esta sesión' : 'Sin mantenimiento activo') +
        '</p><p style="margin:0">' +
        (mantenimiento ? 'Ya puedes reponer canales o cambiar productos desde Inventario.'
                       : 'Inícialo antes de reponer un canal.') + '</p></div>';

    ultima.textContent = 'Última consulta: ' + new Date().toLocaleTimeString();
  }

  async function consultar() {
    try {
      var e = await API.llamarApi('/api/status');
      UI.limpiarAviso();
      pintar(e);
    } catch (err) {
      UI.mostrarError(err);
      contenedor.innerHTML = '<article class="hoja"><p class="estado__rotulo">Sin datos</p>' +
        '<p class="estado__valor">—</p><p class="estado__pie">No se pudo leer el estado.</p></article>';
    }
  }

  async function mantenimiento(ruta, textoOk) {
    UI.limpiarAviso();
    btnIniciar.disabled = btnTerminar.disabled = true;
    try {
      await API.llamarApi(ruta, 'POST');
      UI.exito(textoOk, 'El ESP32 confirmó el cambio de modo.');
    } catch (err) {
      UI.mostrarError(err);
    } finally {
      consultar();
    }
  }

  btnIniciar.addEventListener('click', function () {
    mantenimiento('/api/maintenance/start', 'Mantenimiento iniciado');
  });
  btnTerminar.addEventListener('click', function () {
    mantenimiento('/api/maintenance/end', 'Mantenimiento cerrado');
  });
  document.getElementById('btnActualizar').addEventListener('click', consultar);

  btnRespaldo.addEventListener('click', async function () {
    cajaRespaldo.innerHTML = '<div class="aviso aviso--info"><p class="aviso__titulo">Preparando el respaldo…</p>' +
      '<p style="margin:0">El ESP32 genera el archivo; la web solo lo descarga.</p></div>';
    btnRespaldo.disabled = true;
    try {
      var r = await API.llamarApi('/api/backup');
      var blob = (r instanceof Blob) ? r : await r.blob();
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'vending.db';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      cajaRespaldo.innerHTML = '<div class="aviso aviso--ok"><p class="aviso__titulo">Respaldo descargado</p>' +
        '<p style="margin:0">Archivo vending.db entregado por el ESP32.</p></div>';
    } catch (err) {
      UI.mostrarError(err);
      cajaRespaldo.innerHTML = '';
    } finally {
      btnRespaldo.disabled = false;
    }
  });

  consultar();
  temporizador = setInterval(consultar, 15000);
  window.addEventListener('beforeunload', function () { clearInterval(temporizador); });
})();
