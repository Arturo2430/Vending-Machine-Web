const req_id_rest = [];
const req_id_rech = [];

const cards = [
    {"uid": "A1B3", "balance": 200000, "active": true}, 
    {"uid": "B4D6", "balance": 300000, "active": true}, 
    {"uid": "H9K4", "balance": 450000, "active": true}
];

const slots = [
    {"id": 1, "product": "Coca Cola", "price": 2000, "stock": 10}, 
    {"id": 2, "product": "Escuis Fresa", "price": 2200, "stock": 15}, 
    {"id": 3, "product": "Fanta", "price": 1800, "stock": 13}, 
    {"id": 4, "product": "Dr Pepper", "price": 2500, "stock": 7}
];

const transactions = [
  {"id": 101, "type": "SALE",       "slot": 2, "amount": 1500, "date": "2026-09-10T14:32:00Z"},
  {"id": 102, "type": "RECHARGE",   "slot": null, "amount": 5000, "date": "2026-09-10T14:35:12Z"},
  {"id": 103, "type": "SALE",       "slot": 1, "amount": 2000, "date": "2026-09-10T15:01:47Z"},
  {"id": 104, "type": "SALE",       "slot": 3, "amount": 1800, "date": "2026-09-10T15:20:03Z"},
  {"id": 105, "type": "FAIL",       "slot": 4, "amount": 2500, "date": "2026-09-10T15:44:29Z"},
  {"id": 106, "type": "RESTOCK",    "slot": 1, "amount": 10,   "date": "2026-09-10T16:00:00Z"},
  {"id": 107, "type": "SALE",       "slot": 2, "amount": 2200, "date": "2026-09-10T16:12:18Z"},
  {"id": 108, "type": "SALE",       "slot": 4, "amount": 2500, "date": "2026-09-10T16:30:55Z"},
  {"id": 109, "type": "RECHARGE",   "slot": null, "amount": 3000, "date": "2026-09-10T17:02:41Z"},
  {"id": 110, "type": "SALE",       "slot": 1, "amount": 2000, "date": "2026-09-10T17:25:09Z"},
  {"id": 111, "type": "SALE",       "slot": 3, "amount": 1800, "date": "2026-09-10T17:48:33Z"},
  {"id": 112, "type": "FAIL",       "slot": 2, "amount": 2200, "date": "2026-09-10T18:05:14Z"},
  {"id": 113, "type": "SALE",       "slot": 4, "amount": 2500, "date": "2026-09-10T18:22:50Z"},
  {"id": 114, "type": "RESTOCK",    "slot": 3, "amount": 15,   "date": "2026-09-10T18:40:00Z"},
  {"id": 115, "type": "SALE",       "slot": 1, "amount": 2000, "date": "2026-09-10T19:01:27Z"},
  {"id": 116, "type": "SALE",       "slot": 2, "amount": 2200, "date": "2026-09-10T19:18:44Z"},
  {"id": 117, "type": "RECHARGE",   "slot": null, "amount": 10000, "date": "2026-09-10T19:35:11Z"},
  {"id": 118, "type": "SALE",       "slot": 3, "amount": 1800, "date": "2026-09-10T19:52:38Z"},
  {"id": 119, "type": "SALE",       "slot": 4, "amount": 2500, "date": "2026-09-10T20:10:05Z"},
  {"id": 120, "type": "FAIL",       "slot": 1, "amount": 2000, "date": "2026-09-10T20:27:32Z"},
  {"id": 121, "type": "SALE",       "slot": 2, "amount": 2200, "date": "2026-09-10T20:45:00Z"},
  {"id": 122, "type": "SALE",       "slot": 3, "amount": 1800, "date": "2026-09-10T21:02:27Z"},
  {"id": 123, "type": "RESTOCK",    "slot": 4, "amount": 8,    "date": "2026-09-10T21:20:00Z"},
  {"id": 124, "type": "SALE",       "slot": 1, "amount": 2000, "date": "2026-09-10T21:37:27Z"},
  {"id": 125, "type": "SALE",       "slot": 2, "amount": 2200, "date": "2026-09-10T21:55:00Z"}
];

function fetchMock (url, options) {
    const method = options?.method ?? "GET";

    let body = null;
    if (options?.body) {
        try {
            body = JSON.parse(options.body);
        } catch (e) {
            return Promise.resolve(fakeResponse(400, {code:400, message:"Body inválido"}));
        }
    }
    
    if (url.includes("/api/login") && method == "POST") {
        if (!body || !body.pin) {
            return Promise.resolve(fakeResponse(400, {code:400, message:"No se ha ingresado PIN."}));
        }

        if (body.pin === "1234") {
            return Promise.resolve(fakeResponse(200, {"success": true, "token": "xyz_1234"}));
        }    
        
        return Promise.resolve(fakeResponse(401, {code:401, message:"PIN inválido."}));
    }

    if (url.includes("/api/logout") && method == "POST") {
        return Promise.resolve(fakeResponse(200, {"success": true}));
    }

    if (url.includes("/api/status") && method == "GET") {
        return Promise.resolve(fakeResponse(200, {"status": "ok", "door": "closed", "mode": "maintenance"}));
    }

    if (url.includes("/api/slots/restock") && method == "POST") {
        if (!body || !body.slot || !(body.added_qty > 0) || !body.request_id) {
            return Promise.resolve(fakeResponse(400, {code:400, message:"No se han proporcionado los datos necesarios."}));
        }

        if (req_id_rest.includes(body.request_id)) {
            return Promise.resolve(fakeResponse(409, {code:409, message:"Este request_id ya ha sido utilizado.", request_id: body.request_id}));
        }

        req_id_rest.push(body.request_id);

        return Promise.resolve(fakeResponse(200, {"success": true, "new_stock": 20}));
    }

    if (url.includes("/api/slots") && method == "GET") {
        return Promise.resolve(fakeResponse(200, slots));
    }

    if (url.includes("/api/cards/recharge") && method == "POST") {
        if (!body || !body.uid || !(body.amount > 0) || !body.request_id) {
            return Promise.resolve(fakeResponse(400, {code:400, message:"No se han proporcionado los datos necesarios."}));
        }

        if (!cards.some(c => c.uid === body.uid)) {
            return Promise.resolve(fakeResponse(404, {code:404, message:"No existe una tarjeta con este UID."}));
        }

        if (req_id_rech.includes(body.request_id)) {
            return Promise.resolve(fakeResponse(409, {code:409, message:"Este request_id ya ha sido utilizado.", request_id: body.request_id}));
        }

        req_id_rech.push(body.request_id);

        return Promise.resolve(fakeResponse(200, {"success": true, "new_balance": 10000}));
    }

    if (url.includes("/api/cards") && method == "GET") {
        return Promise.resolve(fakeResponse(200, cards));
    }

    if (url.includes("/api/reports/transactions") && method == "GET") {
        const urlObj = new URL(url, "http://x");
        const page = parseInt(urlObj.searchParams.get("page")) || 1;
        const limit = parseInt(urlObj.searchParams.get("limit")) || 10;

        if (limit <= 0 || page <= 0) {
            return Promise.resolve(fakeResponse(400, {code: 400, message: "Parámetros de paginación inválidos."}))
        }

        const total_pages = Math.ceil(transactions.length / limit);

        if (page > total_pages) {
            return Promise.resolve(fakeResponse(400, {code: 400, message: "Parámetro de paginación inválido."}));
        }

        const start = (page - 1) * limit;
        const end = start + limit;
        const limited_array = transactions.slice(start, end);

        return Promise.resolve(fakeResponse(200, {"page": page, "total_pages": total_pages, "data": limited_array}));
    }

    if (url.includes("/api/backup") && method == "GET") {
        return Promise.resolve(fakeResponse(200, {}, "application/octet-stream"));
    }

    if (url.includes("/api/products") && method == "POST") {
        if (!body || !body.name || !(body.cost > 0)) {
            return Promise.resolve(fakeResponse(400, {code:400, message:"No se han proporcionado los datos necesarios."}));
        }

        return Promise.resolve(fakeResponse(200, {"success": true, "product_id": 5}));
    }
}

function fakeResponse(status, data, contentType = "application/json") {
    return {
        ok: status >= 200 && status < 300,
        status: status,
        headers: {
            get: (nombre) => nombre.toLowerCase() === "content-type" ? contentType : null
        },
        json: () => Promise.resolve(data),
        blob: () => Promise.resolve(new Blob(["contenido"]))
    };
}

window.fetch = fetchMock;