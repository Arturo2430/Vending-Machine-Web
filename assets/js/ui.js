/* ============================================================
   SAID · Utilidades de interfaz compartidas
   Sesión visible, formato de datos, avisos de error del contrato
   y ventanas modales. Sin librerías externas.
   ============================================================ */

window.UI = (function () {
  'use strict';

  /* ---------- sesión visible ---------- */
  function guardarSesion(token, usuario) {
    sessionStorage.setItem('said_token', token);
    sessionStorage.setItem('said_usuario', usuario || 'admin');
  }
  function haySesion() { return !!sessionStorage.getItem('said_token'); }
  function usuario() { return sessionStorage.getItem('said_usuario') || 'admin'; }
  function borrarSesion() {
    sessionStorage.removeItem('said_token');
    sessionStorage.removeItem('said_usuario');
  }
  function exigirSesion() {
    if (!haySesion()) { window.location.href = 'index.html?sesion=expirada'; return false; }
    return true;
  }
  function pintarSesion() {
    var caja = document.querySelector('[data-sesion]');
    if (!caja) return;
    caja.innerHTML =
      '<span><span class="punto-sesion"></span>Sesión: ' + usuario() + '</span>' +
      '<button class="btn btn--claro btn--chico" type="button" id="btnSalir">Cerrar sesión</button>';
    document.getElementById('btnSalir').addEventListener('click', async function () {
      try { await API.llamarApi('/api/logout', 'POST'); } catch (e) { /* la sesión local se cierra igual */ }
      borrarSesion();
      window.location.href = 'index.html';
    });
  }

  /* ---------- formato ---------- */
  function dinero(centavos) {
    if (centavos === null || centavos === undefined || isNaN(centavos)) return '—';
    return '$' + (centavos / 100).toFixed(2);
  }
  function fecha(iso) {
    if (!iso) return null;                       // Q24: se respeta "sin fecha válida"
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    var p = function (n) { return String(n).padStart(2, '0'); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function idPeticion(prefijo) {
    return (prefijo || 'req') + '_' + Date.now().toString(36) +
           '_' + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- avisos (un solo lugar para todos los errores) ---------- */
  function limpiarAviso(selector) {
    var caja = document.querySelector(selector || '[data-aviso]');
    if (caja) { caja.innerHTML = ''; caja.classList.add('oculto'); }
  }
  function aviso(tipo, titulo, texto, meta, selector) {
    var caja = document.querySelector(selector || '[data-aviso]');
    if (!caja) return;
    caja.classList.remove('oculto');
    caja.innerHTML =
      '<div class="aviso aviso--' + tipo + '" role="status">' +
        '<p class="aviso__titulo">' + escapar(titulo) + '</p>' +
        (texto ? '<p style="margin:0">' + escapar(texto) + '</p>' : '') +
        (meta ? '<p class="aviso__meta">' + escapar(meta) + '</p>' : '') +
      '</div>';
  }
  function mostrarError(error, selector) {
    var esApi = error && error.code;
    var tipo = (esApi && error.http === 409) ? 'ocupado' : 'error';
    var meta = esApi
      ? ('code: ' + error.code + (error.http ? ' · HTTP ' + error.http : '') +
         (error.request_id ? ' · request_id: ' + error.request_id : ''))
      : null;
    aviso(tipo,
      esApi ? tituloPorCodigo(error.http) : 'No se pudo completar la operación',
      esApi ? error.message : String(error && error.message || error),
      meta, selector);
    if (esApi && error.http === 401) {
      borrarSesion();
      setTimeout(function () { window.location.href = 'index.html?sesion=expirada'; }, 2200);
    }
  }
  function tituloPorCodigo(http) {
    return ({
      400: 'Dato inválido', 401: 'Sesión no válida', 403: 'Permiso insuficiente',
      404: 'No existe', 409: 'Ocupado', 503: 'Falla interna del ESP32',
      0: 'Sin respuesta del ESP32'
    })[http] || 'Error';
  }
  function exito(titulo, texto, meta, selector) { aviso('ok', titulo, texto, meta, selector); }

  function escapar(t) {
    return String(t === null || t === undefined ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- modal ---------- */
  function abrirModal(html) {
    cerrarModal();
    var capa = document.createElement('div');
    capa.className = 'modal';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.innerHTML = '<div class="modal__caja">' + html + '</div>';
    capa.addEventListener('mousedown', function (e) { if (e.target === capa) cerrarModal(); });
    document.addEventListener('keydown', teclaEscape);
    document.body.appendChild(capa);
    var primero = capa.querySelector('input,select,button');
    if (primero) primero.focus();
    return capa;
  }
  function teclaEscape(e) { if (e.key === 'Escape') cerrarModal(); }
  function cerrarModal() {
    var capa = document.querySelector('.modal');
    if (capa) capa.remove();
    document.removeEventListener('keydown', teclaEscape);
  }

  /* ---------- navegación activa ---------- */
  function marcarNav() {
    var actual = location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.barra__nav a').forEach(function (a) {
      if (a.getAttribute('href') === actual) a.setAttribute('aria-current', 'page');
    });
  }

  function iniciarPagina() {
    if (!exigirSesion()) return false;
    pintarSesion();
    marcarNav();
    return true;
  }

  return {
    guardarSesion: guardarSesion, haySesion: haySesion, borrarSesion: borrarSesion,
    exigirSesion: exigirSesion, pintarSesion: pintarSesion, usuario: usuario,
    dinero: dinero, fecha: fecha, idPeticion: idPeticion, escapar: escapar,
    aviso: aviso, limpiarAviso: limpiarAviso, mostrarError: mostrarError, exito: exito,
    abrirModal: abrirModal, cerrarModal: cerrarModal, iniciarPagina: iniciarPagina
  };
})();
