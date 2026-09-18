/* ============================================================
   SAID · Inicio de sesión
   POST /api/login  ->  {"pin":"1234"}
   Respuesta: {"success":true,"token":"..."}  ·  401 si falla
   El campo "Usuario" solo alimenta el indicador de sesión visible;
   el contrato únicamente recibe el PIN.
   ============================================================ */
(function () {
  'use strict';

  var form = document.getElementById('formAcceso');
  var pin = document.getElementById('pin');
  var usuario = document.getElementById('usuario');
  var recordar = document.getElementById('recordar');
  var boton = document.getElementById('btnEntrar');

  // Si ya hay sesión abierta en esta pestaña, no se pide de nuevo
  if (UI.haySesion()) { window.location.replace('dashboard.html'); return; }

  // Usuario recordado (solo texto, nunca el PIN)
  var guardado = localStorage.getItem('said_usuario_recordado');
  if (guardado) { usuario.value = guardado; recordar.checked = true; }

  if (new URLSearchParams(location.search).get('sesion') === 'expirada') {
    UI.aviso('info', 'La sesión se cerró', 'Vuelve a ingresar el PIN para continuar.');
  }

  document.getElementById('verPin').addEventListener('click', function () {
    pin.type = pin.type === 'password' ? 'text' : 'password';
    pin.focus();
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    UI.limpiarAviso();

    var valor = pin.value.trim();
    if (valor.length < 4) {
      UI.aviso('error', 'PIN incompleto', 'El PIN administrativo tiene al menos 4 dígitos.');
      pin.focus();
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Verificando…';
    try {
      var r = await API.llamarApi('/api/login', 'POST', { pin: valor });
      UI.guardarSesion(r.token, usuario.value.trim() || 'admin');
      if (recordar.checked) localStorage.setItem('said_usuario_recordado', usuario.value.trim());
      else localStorage.removeItem('said_usuario_recordado');
      window.location.href = 'dashboard.html';
    } catch (err) {
      UI.mostrarError(err);
      pin.value = '';
      pin.focus();
    } finally {
      boton.disabled = false;
      boton.textContent = 'Entrar';
    }
  });
})();
