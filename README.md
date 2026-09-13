<div align="center">

# Aplicación Web - Máquina Expendedora

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)

**ITIID 7-1 · Septiembre - Diciembre 2026**

*Docente: Dr. Said Polanco Martagón*

</div>

---

## Resumen

Este repositorio contiene el código fuente de la Interfaz Web Administrativa de la máquina expendedora SAID.

Debido a que la máquina no tiene conexión a internet y opera de forma autónoma, esta aplicación web está construida exclusivamente con **HTML, CSS y JavaScript puros (Vanilla)**. No se utilizan frameworks pesados para garantizar que los archivos finales sean extremadamente ligeros y puedan alojarse dentro de la memoria Flash (LittleFS) del ESP32.

### ⚠️ Reglas Estrictas de Desarrollo
1. **Cero Dependencias Externas:** Está **estrictamente prohibido** utilizar CDNs para fuentes (ej. Google Fonts), iconos (ej. FontAwesome) o librerías (ej. Bootstrap/jQuery). Todo recurso debe estar descargado en la carpeta `assets/`.
2. **Consumo de API:** El frontend no tiene acceso a bases de datos. Todo se gestiona mediante peticiones `fetch()` a la API REST servida por el ESP32 (rutas `/api/...`).
3. **Optimización:** El código final entregado al ESP32 debe estar minificado y empaquetado para ahorrar memoria.

---

## Estructura del Proyecto

| Directorio | Propósito |
| :--- | :--- |
| 📄 **`index.html`** | Archivo base y estructura principal de la interfaz. |
| 🎨 **`css/`** | Hojas de estilo puras. Diseño 100% adaptable (Responsivo). |
| ⚙️ **`js/`** | Lógica de la aplicación, formularios, vistas dinámicas y llamadas `fetch()`. |
| 🖼️ **`assets/`** | Imágenes, logotipos, e iconos descargados localmente. |
| 📦 **`dist/`** | *(Generada al final)* Carpeta con la versión minificada, empaquetada y lista para inyectarse al ESP32. |

---

## Subgrupo Aplicación Web

El desarrollo de esta interfaz está a cargo de:

* **Georgina Reta Limas:** Diseño de pantallas de estado, inventario, tarjetas e informes.
* **Angel Gabriel Coronado Sánchez:** Capa cliente HTTP (JS), control de formularios, manejo de errores, sesión visible y paginación.
* **Junior Arturo Vázquez Leonel:** Empaquetar recursos locales (minificación y creación del `dist/`), asegurar el diseño adaptable y realizar las pruebas de acceso por la red SoftAP junto al ESP32.

---

<div align="center">

**Universidad Politécnica de Victoria · ITIID 7-1 · Septiembre - Diciembre 2026**

</div>