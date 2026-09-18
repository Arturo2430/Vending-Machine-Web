/* ============================================================
   SAID · Informes (historial de transacciones)
   GET /api/reports/transactions?page=1&limit=10
   Paginación obligatoria: se pide una página a la vez.
   Q24: un registro sin fecha válida se marca como tal, nunca se
   rellena con la fecha de hoy.
   ============================================================ */
(function () {
  'use strict';
  if (!UI.iniciarPagina()) return;

  var cuerpo = document.getElementById('cuerpoReportes');
  var paginacion = document.getElementById('paginacion');
  var filtroTipo = document.getElementById('filtroTipo');
  var filtroLimite = document.getElementById('filtroLimite');

  var pagina = 1;

  var ETIQUETAS = {
    SALE:     { texto: 'Venta',       clase: 'etq--venta' },
    RECHARGE: { texto: 'Recarga',     clase: 'etq--recarga' },
    RESTOCK:  { texto: 'Reposición',  clase: 'etq--reposicion' },
    FAIL:     { texto: 'Falla',       clase: 'etq--falla' }
  };

  function fila(m) {
    var e = ETIQUETAS[m.type] || { texto: m.type, clase: '' };
    var f = UI.fecha(m.date);
    var canal = m.slot ? ('Canal ' + m.slot + (m.product ? ' · ' + m.product : '')) : '—';
    return '<tr>' +
      '<td style="font-family:var(--mono)">#' + UI.escapar(m.id) + '</td>' +
      '<td><span class="etq ' + e.clase + '">' + e.texto + '</span></td>' +
      '<td>' + UI.escapar(canal) + '</td>' +
      '<td style="font-family:var(--mono)">' + UI.escapar(m.uid || '—') + '</td>' +
      '<td class="num">' + (m.type === 'RESTOCK' ? '—' : UI.dinero(m.amount)) + '</td>' +
      '<td>' + (m.result === 'OK' ? 'Completado' : UI.escapar(m.result || '—')) + '</td>' +
      '<td>' + (f ? UI.escapar(f) : '<span class="etq etq--sinfecha">Sin fecha válida</span>') + '</td>' +
    '</tr>';
  }

  function pintarPaginacion(actual, total, items) {
    var html = '';
    html += '<button type="button" data-pagina="' + (actual - 1) + '"' +
            (actual <= 1 ? ' disabled' : '') + ' aria-label="Página anterior">‹</button>';

    var desde = Math.max(1, actual - 2);
    var hasta = Math.min(total, desde + 4);
    desde = Math.max(1, hasta - 4);
    if (desde > 1) html += '<button type="button" data-pagina="1">1</button>' + (desde > 2 ? '<span>…</span>' : '');
    for (var i = desde; i <= hasta; i++) {
      html += '<button type="button" data-pagina="' + i + '"' +
              (i === actual ? ' aria-current="true"' : '') + '>' + i + '</button>';
    }
    if (hasta < total) html += (hasta < total - 1 ? '<span>…</span>' : '') +
      '<button type="button" data-pagina="' + total + '">' + total + '</button>';

    html += '<button type="button" data-pagina="' + (actual + 1) + '"' +
            (actual >= total ? ' disabled' : '') + ' aria-label="Página siguiente">›</button>';
    html += '<span class="paginacion__info">Página ' + actual + ' de ' + total +
            (items ? ' · ' + items + ' movimientos' : '') + '</span>';

    paginacion.innerHTML = html;
    paginacion.querySelectorAll('[data-pagina]').forEach(function (b) {
      b.addEventListener('click', function () {
        pagina = Number(b.dataset.pagina);
        cargar();
      });
    });
  }

  async function cargar() {
    cuerpo.innerHTML = '<tr><td colspan="7" class="vacio">Consultando al ESP32…</td></tr>';
    var ruta = '/api/reports/transactions?page=' + pagina + '&limit=' + filtroLimite.value +
               (filtroTipo.value ? '&type=' + filtroTipo.value : '');
    try {
      var r = await API.llamarApi(ruta);
      UI.limpiarAviso();
      if (!r.data || !r.data.length) {
        cuerpo.innerHTML = '<tr><td colspan="7" class="vacio">No hay movimientos con ese filtro.</td></tr>';
        paginacion.innerHTML = '';
        return;
      }
      cuerpo.innerHTML = r.data.map(fila).join('');
      pintarPaginacion(r.page || pagina, r.total_pages || 1, r.total_items);
    } catch (err) {
      UI.mostrarError(err);
      cuerpo.innerHTML = '<tr><td colspan="7" class="vacio">No se pudo leer el historial.</td></tr>';
      paginacion.innerHTML = '';
    }
  }

  filtroTipo.addEventListener('change', function () { pagina = 1; cargar(); });
  filtroLimite.addEventListener('change', function () { pagina = 1; cargar(); });
  document.getElementById('btnActualizarTabla').addEventListener('click', cargar);

  cargar();
})();
