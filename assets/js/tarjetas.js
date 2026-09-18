/* ============================================================
   SAID · Tarjetas RFID
   GET  /api/cards
   POST /api/cards/recharge   {uid, amount, request_id}
   La recarga usa request_id: repetir la confirmación no genera
   un segundo movimiento (misma regla que la reposición).
   ============================================================ */
(function () {
  'use strict';
  if (!UI.iniciarPagina()) return;

  var cuerpo = document.getElementById('cuerpoTarjetas');
  var tarjetas = [];

  function pintar() {
    if (!tarjetas.length) {
      cuerpo.innerHTML = '<tr><td colspan="5" class="vacio">Todavía no hay tarjetas registradas. ' +
        'Pasa una tarjeta por el lector del ESP32 para darla de alta.</td></tr>';
      return;
    }
    cuerpo.innerHTML = tarjetas.map(function (t) {
      return '<tr>' +
        '<td style="font-family:var(--mono)">' + UI.escapar(t.uid) + '</td>' +
        '<td>' + UI.escapar(t.label || '—') + '</td>' +
        '<td class="num">' + UI.dinero(t.balance) + '</td>' +
        '<td>' + (t.active ? '<span class="etq etq--activa">Activa</span>'
                           : '<span class="etq etq--inactiva">Deshabilitada</span>') + '</td>' +
        '<td><button class="btn btn--chico" data-recargar="' + UI.escapar(t.uid) + '"' +
            (t.active ? '' : ' disabled') + '>Recargar saldo</button></td>' +
      '</tr>';
    }).join('');

    cuerpo.querySelectorAll('[data-recargar]').forEach(function (b) {
      b.addEventListener('click', function () { modalRecarga(b.dataset.recargar); });
    });
  }

  async function cargar() {
    try {
      tarjetas = await API.llamarApi('/api/cards');
      UI.limpiarAviso();
      pintar();
    } catch (err) {
      UI.mostrarError(err);
      cuerpo.innerHTML = '<tr><td colspan="5" class="vacio">No se pudo leer la lista de tarjetas.</td></tr>';
    }
  }

  function modalRecarga(uid) {
    var tarjeta = tarjetas.filter(function (t) { return t.uid === uid; })[0];
    var peticion = UI.idPeticion('rec');

    var capa = UI.abrirModal(
      '<h3>Recargar tarjeta</h3>' +
      '<p class="modal__nota">UID ' + UI.escapar(uid) + ' · saldo actual ' + UI.dinero(tarjeta.balance) + '</p>' +
      '<div data-aviso-modal></div>' +
      '<div class="campo"><label for="monto">Monto en pesos</label>' +
      '<input id="monto" type="number" min="1" step="1" value="50"></div>' +
      '<div class="acciones" style="margin-bottom:6px">' +
        '<button class="btn btn--claro btn--chico" data-monto="20">$20</button>' +
        '<button class="btn btn--claro btn--chico" data-monto="50">$50</button>' +
        '<button class="btn btn--claro btn--chico" data-monto="100">$100</button>' +
      '</div>' +
      '<div class="resumen" id="resumenRecarga"></div>' +
      '<div class="acciones"><button class="btn" id="confirmarRecarga">Confirmar recarga</button>' +
      '<button class="btn btn--claro" id="cancelarRecarga">Cancelar</button></div>'
    );

    var monto = capa.querySelector('#monto');
    var resumen = capa.querySelector('#resumenRecarga');
    function pintarResumen() {
      var centavos = Math.round(Number(monto.value) * 100) || 0;
      resumen.innerHTML =
        '<div><span>Saldo actual</span><span>' + UI.dinero(tarjeta.balance) + '</span></div>' +
        '<div><span>Recarga</span><span>' + UI.dinero(centavos) + '</span></div>' +
        '<div><span>Saldo estimado</span><span>' + UI.dinero(tarjeta.balance + centavos) + '</span></div>' +
        '<div><span>request_id</span><span>' + peticion + '</span></div>';
    }
    monto.addEventListener('input', pintarResumen);
    capa.querySelectorAll('[data-monto]').forEach(function (b) {
      b.addEventListener('click', function () { monto.value = b.dataset.monto; pintarResumen(); });
    });
    pintarResumen();

    capa.querySelector('#cancelarRecarga').addEventListener('click', UI.cerrarModal);
    capa.querySelector('#confirmarRecarga').addEventListener('click', async function () {
      var centavos = Math.round(Number(monto.value) * 100);
      if (!(centavos > 0)) {
        UI.aviso('error', 'Monto inválido', 'Captura una cantidad mayor que cero.', null, '[data-aviso-modal]');
        return;
      }
      this.disabled = true; this.textContent = 'Enviando…';
      try {
        var r = await API.llamarApi('/api/cards/recharge', 'POST',
          { uid: uid, amount: centavos, request_id: peticion });
        UI.cerrarModal();
        UI.exito('Recarga aplicada',
          'La tarjeta ' + uid + ' quedó con ' + UI.dinero(r.new_balance) + ' según el ESP32.',
          'request_id: ' + peticion);
        cargar();
      } catch (err) {
        UI.mostrarError(err, '[data-aviso-modal]');
        var b = capa.querySelector('#confirmarRecarga');
        b.disabled = false; b.textContent = 'Reintentar con el mismo request_id';
      }
    });
  }

  document.getElementById('btnRecargarLista').addEventListener('click', cargar);
  cargar();
})();
