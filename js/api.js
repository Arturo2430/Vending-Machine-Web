const API = "http://192.168.4.1";

function apiCall(route, method = "GET", data = null) {
    const options = {
        method: method,
        headers: {}
    };

    const token = sessionStorage.getItem("token");
    if (token) {
        options.headers["Authorization"] = "Bearer " + token;
    }

    if (data) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
    }

    return fetch(API + route, options)
        .then(response => {
            if (response.ok) {
                const tipo = response.headers.get("Content-Type") || "application/json";
                if (tipo.includes("application/json")) {
                    return response.json();
                }
                return response.blob();
            }

            return response.json()
                .catch(() => ({code: 500, message: "Error del servidor."}))
                .then(error => {
                    if (error.code === 401 && !route.includes("/api/login")) {
                        sessionStorage.removeItem("token");
                    }
                    showError(error);
                    throw error;
                });
        });
}

function showError(error) {
    if (!error) {
        return;
    }
    console.log("Error:", error.code, error.message, error.request_id || "");
}

function login(pin) {
    return apiCall("/api/login", "POST", {pin: pin})
        .then(data => {
            if (data.token) {
                sessionStorage.setItem("token", data.token);
            }
            return data;
        });
}

function logout() {
    return apiCall("/api/logout", "POST")
        .then(data => {
            sessionStorage.removeItem("token");
            return data;
        })
        .catch(error => {
            sessionStorage.removeItem("token");
            throw error;
        });
}