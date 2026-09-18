/* ============================================================
   SAID · Datos de prueba (D4)
   Sirven para ver las pantallas completas sin el ESP32.
   Cuando el firmware tenga las rutas listas, basta con poner
   API.usarMock = false en api.js.
   ============================================================ */

window.MOCK = (function () {
  'use strict';

  var PIN_VALIDO = '1234';

  var estado = {
    status: 'ok',
    state: 'REPOSO',
    door: 'closed',          // closed | open
    barrier: 'clear',        // clear | blocked
    mode: 'operation',       // operation | maintenance
    uart: 'ok',
    pending_restock: null,   // {slot:1, request_id:'...'}
    last_update: '2026-09-17T10:42:00'
  };

  var slots = [
    { id: 1, product: 'Coca Cola 355 ml', price: 2000, stock: 4, capacity: 4, version: 7 },
    { id: 2, product: 'Sabritas Adobadas', price: 1500, stock: 2, capacity: 4, version: 5 },
    { id: 3, product: 'Chocolate Carlos V', price: 1200, stock: 0, capacity: 4, version: 9 },
    { id: 4, product: 'Galletas Emperador', price: 1800, stock: 3, capacity: 4, version: 4 }
  ];

  var productos = [
    { id: 1, name: 'Coca Cola 355 ml', cost: 2000 },
    { id: 2, name: 'Sabritas Adobadas', cost: 1500 },
    { id: 3, name: 'Chocolate Carlos V', cost: 1200 },
    { id: 4, name: 'Galletas Emperador', cost: 1800 },
    { id: 5, name: 'Gansito', cost: 1600 }
  ];

  var cards = [
    { uid: 'A1B2C3D4', label: 'Demo 1', balance: 5000, active: true },
    { uid: '9F8E7D6C', label: 'Demo 2', balance: 1250, active: true },
    { uid: '44AA11BB', label: 'Demo 3', balance: 0, active: false },
    { uid: '73C0FFEE', label: 'Demo 4', balance: 12000, active: true }
  ];

  // --- historial: ventas, recargas, reposiciones y fallas ---
  var transactions = (function () {
    var tipos = ['SALE', 'SALE', 'SALE', 'RECHARGE', 'RESTOCK', 'FAIL'];
    var lista = [];
    for (var i = 0; i < 47; i++) {
      var tipo = tipos[i % tipos.length];
      var dia = 17 - Math.floor(i / 6);
      var hora = 9 + (i % 9);
      // Q24: algunos registros se guardaron sin reloj válido
      var fecha = (i === 3 || i === 12 || i === 26)
        ? null
        : '2026-09-' + String(dia).padStart(2, '0') + 'T' +
          String(hora).padStart(2, '0') + ':' + String((i * 7) % 60).padStart(2, '0') + ':00';

      lista.push({
        id: 1000 - i,
        type: tipo,
        slot: tipo === 'RECHARGE' ? null : (i % 4) + 1,
        product: tipo === 'RECHARGE' ? null : slots[i % 4].product,
        uid: tipo === 'RECHARGE' ? cards[i % cards.length].uid : (i % 2 ? cards[i % cards.length].uid : null),
        amount: tipo === 'RECHARGE' ? 5000 : (tipo === 'RESTOCK' ? 0 : slots[i % 4].price),
        result: tipo === 'FAIL' ? 'NO_ENTREGADO' : 'OK',
        date: fecha
      });
    }
    return lista;
  })();

  var datos = {
    pin: PIN_VALIDO,
    estado: estado,
    slots: slots,
    productos: productos,
    cards: cards,
    transactions: transactions
  };

  /* Los datos de prueba se conservan mientras dure la sesión del navegador,
     para que el modo de mantenimiento o un stock repuesto sigan iguales al
     cambiar de pantalla. Se borran al cerrar la pestaña. */
  try {
    var guardado = sessionStorage.getItem('said_mock');
    if (guardado) {
      var previo = JSON.parse(guardado);
      datos.estado = previo.estado;
      datos.slots = previo.slots;
      datos.cards = previo.cards;
      datos.productos = previo.productos;
      datos.transactions = previo.transactions;
    }
  } catch (e) { /* si falla, se usan los datos iniciales */ }

  datos.guardar = function () {
    try {
      sessionStorage.setItem('said_mock', JSON.stringify({
        estado: datos.estado, slots: datos.slots, cards: datos.cards,
        productos: datos.productos, transactions: datos.transactions
      }));
    } catch (e) { /* sin persistencia, no pasa nada */ }
  };

  return datos;
})();
