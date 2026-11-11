# TRIBU - Asistente Contable y Mini-Navegador SRI Ecuador

> **Estado del Proyecto:** Versión Alpha (`v0.1.0-alpha`)  
> Software de escritorio ligero basado en **Electron (Chromium)** diseñado para contadores y contribuyentes en Ecuador que gestionan clientes y trámites en el portal **SRI en Línea**.

---

## 🚀 Principales Características

1. **Gestión de Carpeta de Clientes Única:**
   - Define tu carpeta raíz contable una sola vez (ej: `C:\Contabilidad\SRI_Clientes\`).
   - Al registrar a cada cliente, su subcarpeta se crea **automáticamente** con su nombre o razón social.
   - Detección inteligente de duplicados y homónimos para evitar sobreescritura accidental.

2. **Organización Inteligente por Fechas (Tal como en el SRI):**
   - El sistema analiza la clave de acceso oficial de 49 dígitos del SRI (`ddmmaaaa...`) y clasifica cada archivo en:
     - `[Cliente] / Ventas (o Compras) / [Año] / [Mes] / XML / [nombreOriginal].xml`
     - `[Cliente] / Ventas (o Compras) / [Año] / [Mes] / PDF / [nombreOriginal].pdf`

3. **Nombres Originales del SRI:**
   - Conserva estrictamente el nombre oficial entregado por el SRI (sin sufijos, sin timestamps ni modificaciones).

4. **Descargador Ultra-Rápido:**
   - Optimizado con disparos reactivos de 60ms por comprobante y detección automática del cambio de página sin pausas ciegas.
   - Pasa de tardar 45 segundos por página a **menos de 4 segundos por página**.

5. **Reclamo Automático (Devolución de IVA - Discapacidad / Tercera Edad):**
   - Automatización fila a fila de la tabla de comprobantes en el portal de devolución de IVA.
   - Inferencia inteligente de tipo de gasto (alimentación, salud, educación, vestimenta, vivienda) según la razón social del emisor.
   - Relleno automático de IVA solicitado y marcado de casillas de selección con barra de progreso en tiempo real.

6. **Módulo ATS Autónomo y Exportación CSV:**
   - Generación del Anexo Transaccional Simplificado (ATS) en formato XML oficial a partir de los XMLs descargados.
   - Exportación de reportes detallados en CSV compatibles con Microsoft Excel.

7. **Sesiones 100% Aisladas y Credenciales Seguras:**
   - Cada cliente tiene una partición independiente de Chromium (`persist:sri_[RUC]`), evitando mezclar cookies o tener que limpiar el historial del navegador.
   - Credenciales cifradas con AES-256 en almacenamiento seguro local.

8. **Inicio de Sesión Automático:**
   - Detecta los campos oficiales `#usuario` y `#password`, y ejecuta el cifrado nativo del SRI (`CryptoJS.MD5 + SHA512`) de forma transparente.

---

## 🛠️ Ejecución

Haz doble clic en:
📁 **`iniciar-tribu.bat`**

O desde la terminal:
```powershell
npm start
```

### Ejecución de Pruebas
```powershell
npm test
```
