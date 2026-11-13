<p align="center">
  <img src="assets/tribu_logo_horizontal.png" alt="TRIBU - Asistente Contable SRI Ecuador" width="560">
</p>

<p align="center">
  <strong>El asistente de escritorio inteligente para contadores y contribuyentes del SRI Ecuador.</strong><br>
  Automatiza descargas masivas de facturas, conciliacion tributaria, reclamos de IVA y generacion de anexos oficiales en segundos.
</p>

<p align="center">
  <a href="https://github.com/JeanAxon/TRIBU/releases/download/v0.1.6/TRIBU-Setup-0.1.6.exe">
    <img src="https://img.shields.io/badge/Descargar-Windows_(.exe)-0c4597?style=for-the-badge&logo=windows&logoColor=white" alt="Descargar para Windows">
  </a>
  <a href="https://github.com/JeanAxon/TRIBU/releases/download/v0.1.6/TRIBU-0.1.6-mac-universal.dmg">
    <img src="https://img.shields.io/badge/Descargar-macOS_(.dmg)-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Descargar para macOS">
  </a>
  <img src="https://img.shields.io/badge/Version-v0.1.6-00d293?style=for-the-badge" alt="Version Oficial">
  <img src="https://img.shields.io/badge/Licencia-Privada-1e293b?style=for-the-badge" alt="Licencia">
</p>

---

## Que hace TRIBU por ti

- **Descarga Masiva de Facturas (XML y PDF):**
  Descarga cientos de comprobantes electronicos (compras recibidas y ventas emitidas) organizandolos automaticamente en carpetas por cliente, ano y mes.

- **Visor RIDE Digital e Interceptacion Inteligente SRI:**
  Previsualizacion fiel de facturas en formato RIDE oficial del SRI con codigo de barras Code 128 vectorial (SVG), impresion directa, copiado de clave de acceso e interceptacion en tiempo real de clics de descarga en el portal del SRI.

- **Anexo Transaccional Simplificado (ATS) Oficial & ZIP SRI:**
  Generacion automatica del archivo XML del ATS y empaquetado directo en formato comprimido ZIP oficial (AT[MM][AAAA].zip) listo para validacion en el SRI. Incluye soporte para ATS en Ceros sin movimiento de compras ni ventas y exportacion de reportes en CSV para Excel.

- **Modulo de Retenciones AIR e IVA y Comprobantes Fisicos/Anulados:**
  Extraccion y consolidacion automatica de retenciones en la fuente de Impuesto a la Renta (AIR) e IVA, registro manual de comprobantes fisicos no electronicos y serializacion del bloque de comprobantes anulados.

- **Conciliador Tributario ATS vs Formulario 104 y Formulario 103:**
  Cruce automatico entre los comprobantes del anexo y los casilleros oficiales de las declaraciones del SRI, con balance al centavo y deteccion preventiva de discrepancias tributarias.

- **Declaracion Asistida de IVA (Formulario 104):**
  Asistente integral de precalculo de bases imponibles y credito tributario con autollenado guiado en linea.

- **Reclamo Automatico de IVA (Discapacidad y Tercera Edad):**
  Rellena en 1 clic la tabla oficial de devolucion del SRI: calcula montos de IVA, marca casillas e infiere inteligentemente el tipo de gasto (alimentacion, salud, educacion, vestimenta, vivienda).

- **Sesiones Aisladas y Privacidad Total:**
  Cada RUC cuenta con su propia sesion independiente de navegacion. Las credenciales y archivos se guardan exclusivamente en el equipo del usuario con cifrado local AES-256.

---

## Instalacion Rapida

### Windows (10 / 11)
1. **Descarga el instalador:** Haz clic en el boton azul de Windows o descargalo desde **[GitHub Releases](https://github.com/JeanAxon/TRIBU/releases/latest)**.
2. **Ejecuta el archivo:** Sigue el asistente de instalacion de TRIBU.
3. **Inicio:** Abre TRIBU desde el acceso directo de tu Escritorio o Menu Inicio.

### macOS (Big Sur 11.0 o superior)
1. **Descarga el archivo `.dmg`:** Haz clic en el boton de macOS (instalador universal compatible con Intel y Apple Silicon).
2. **Instala:** Abre el archivo `.dmg` y arrastra el icono de **TRIBU** a la carpeta **Aplicaciones**.
3. **Primer inicio:** Al abrir la aplicacion por primera vez en macOS, haz **Clic derecho (o Control + Clic)** sobre la app y selecciona **'Abrir'** para autorizar la ejecucion en macOS Gatekeeper.

---

## Para Desarrolladores

Para compilar o ejecutar el codigo fuente en desarrollo:

```powershell
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm start

# Ejecutar bateria de pruebas unitarias y de integracion
npm test

# Compilar instalador oficial de Windows
npm run dist

# Compilar instalador oficial de macOS
npm run dist:mac
```
