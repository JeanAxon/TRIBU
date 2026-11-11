<p align="center">
  <img src="assets/tribu_logo_horizontal.png" alt="TRIBU - Asistente Contable SRI Ecuador" width="560">
</p>

<p align="center">
  <strong>El asistente de escritorio inteligente para contadores y contribuyentes del SRI Ecuador.</strong><br>
  Automatiza descargas masivas de facturas, reclamos de IVA y generación de anexos tributarios en segundos.
</p>

<p align="center">
  <a href="https://github.com/JeanAxon/TRIBU/releases/download/v0.1.0-alpha/TRIBU-Setup-0.1.0-alpha.exe">
    <img src="https://img.shields.io/badge/Descargar_TRIBU-Windows_(.exe)-0c4597?style=for-the-badge&logo=windows&logoColor=white" alt="Descargar para Windows">
  </a>
  <img src="https://img.shields.io/badge/Versi%C3%B3n-v0.1.0--alpha-00d293?style=for-the-badge" alt="Versión Alpha">
  <img src="https://img.shields.io/badge/Licencia-Privada-1e293b?style=for-the-badge" alt="Licencia">
</p>

---

## ⚡ ¿Qué hace TRIBU por ti?

- **📥 Descarga Masiva de Facturas (XML y PDF):**
  Descarga cientos de comprobantes electrónicos del portal SRI en segundos, organizándolos automáticamente en carpetas por cliente, tipo (Ventas/Compras), año y mes.

- **📋 Reclamo Automático de IVA (Discapacidad y Tercera Edad):**
  Rellena en 1 clic la tabla oficial de devolución del SRI: calcula montos de IVA, marca casillas e infiere inteligentemente el tipo de gasto (alimentación, salud, educación, vestimenta, vivienda) según el comercio.

- **📊 Anexo Transaccional Simplificado (ATS) & Excel:**
  Genera el archivo XML oficial del ATS listo para validar en el DIMM / SRI y exporta reportes detallados en CSV compatibles con Microsoft Excel.

- **🔒 Sesiones Aisladas y Privacidad Total:**
  Cada RUC cuenta con su propia sesión independiente de navegación. Tus contraseñas y archivos se guardan **únicamente en tu equipo** con cifrado local AES-256.

---

## 🚀 Instalación Rápida (Windows)

1. **Descarga el instalador:** Haz clic en el botón superior o descarga directamente **[TRIBU-Setup-0.1.0-alpha.exe](https://github.com/JeanAxon/TRIBU/releases/download/v0.1.0-alpha/TRIBU-Setup-0.1.0-alpha.exe)**.
2. **Ejecuta el archivo:** Sigue los pasos del asistente de instalación.
3. **¡Listo!** Abre TRIBU desde el acceso directo de tu Escritorio o Menú Inicio.

---

## 💻 Para Desarrolladores

Si deseas compilar o probar el código fuente:

```powershell
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm start

# Ejecutar batería de pruebas unitarias y DOM
npm test

# Compilar instalador oficial de Windows
npm run dist
```
