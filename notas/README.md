## Cómo verlo

Con un servidor local (no abras el HTML con doble clic, el navegador bloquea parte del JS):

```
python -m http.server 8080
```
y entra a `http://localhost:8080`. PIN de prueba: **1234**.

## Pasar de datos de prueba al ESP32 real

En `assets/js/api.js`, línea de configuración:

```js
API.usarMock = false;   // ya no responde mock.js, responde el ESP32
```

Se recomienda migrar pantalla por pantalla (estado → inventario → tarjetas → informes), como pide el hito D7.

## Reglas del proyecto que ya están implementadas

- Los 6 códigos de error (400, 401, 403, 404, 409, 503) se muestran con `code`, `message` y `request_id` desde una sola función (`UI.mostrarError`). La web nunca inventa un resultado local.
- La reposición pide el **total final** (lo que queda físicamente) y calcula `added_qty` contra el stock que reportó el ESP32.
- El `request_id` de una reposición se guarda por canal: si recargas la página o reintentas, se envía el mismo y no se crea una segunda operación (prueba Q12).
- Si el teclado u otra sesión tiene el mantenimiento abierto, se muestra "ocupado" y no se permite editar (prueba Q13).
- Los registros sin fecha válida se marcan como tales, nunca como si fueran de hoy (prueba Q24).
- El respaldo solo se solicita y se descarga; la web no toca el archivo SQLite (prueba Q23).
- Las recargas se distinguen de las ventas con etiquetas propias en el historial.

## Dos puntos que hay que cerrar con Arquitectura y ESP32

1. **Reposición**: el documento de pantallas define `POST /api/slots/restock` con `added_qty`; el encargo del subgrupo habla de `POST /api/restock/start` y `/commit` con total final. Aquí se usa la ruta del documento de pantallas, enviando `added_qty` calculado. Si ESP32 implementa start/commit, solo cambia la función `modalReposicion` en `assets/js/inventario.js`.
2. **Historial**: se consume `GET /api/reports/transactions?page&limit`. Si el firmware expone `GET /api/transactions`, se ajusta la ruta en `assets/js/reportes.js` (el mock responde a las dos).

## Pendientes sugeridos

- Minificar CSS y JS y comprimir en gzip antes de subirlos a la flash (tarea de Junior, D6).
- Confirmar con ESP32 si la sesión viaja como `Authorization: Bearer <token>` o como cookie; hoy se envía como Bearer.
- Reducir el peso de `background_login.jpeg` y `maquina_expendedora.png` si el tiempo de carga por SoftAP resulta alto.


## Nota
Despues que se entienda todo borrar esta carpeta e integrar lo que se considere importante al readme principal