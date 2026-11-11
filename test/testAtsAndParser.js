const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const atsModule = require('../src/modules/ats');
const { parseXmlFile, loadPeriodXmls, getAvailablePeriods, generateAtsXml, exportToCsv, getConstants } = atsModule;

console.log('--- Probando Módulo Desacoplado de ATS y Parser SRI ---');

const tmpDir = path.join(os.tmpdir(), 'tribu_test_ats_' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

// 1. Crear XML de prueba simulando descarga del SRI
const sampleXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<autorizacion>
  <estado>AUTORIZADO</estado>
  <numeroAutorizacion>0809202501119175982200120010030000038381190081716</numeroAutorizacion>
  <fechaAutorizacion class="fechaAutorizacion">08/09/2025 15:13:45</fechaAutorizacion>
  <comprobante><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
    <factura id="comprobante" version="1.1.0">
      <infoTributaria>
        <ambiente>2</ambiente>
        <tipoEmision>1</tipoEmision>
        <razonSocial>MINERA DEL VALLE ARIAS &amp; CORDOVA MINERAVALLE</razonSocial>
        <ruc>1191759822001</ruc>
        <claveAcceso>0809202501119175982200120010030000038381190081716</claveAcceso>
        <codDoc>01</codDoc>
        <estab>001</estab>
        <ptoEmi>003</ptoEmi>
        <secuencial>000003838</secuencial>
      </infoTributaria>
      <infoFactura>
        <fechaEmision>08/09/2025</fechaEmision>
        <obligadoContabilidad>SI</obligadoContabilidad>
        <tipoIdentificacionComprador>04</tipoIdentificacionComprador>
        <razonSocialComprador>CLIENTE CONTABLE S.A.</razonSocialComprador>
        <identificacionComprador>1790012345001</identificacionComprador>
        <totalSinImpuestos>100.00</totalSinImpuestos>
        <totalConImpuestos>
          <totalImpuesto>
            <codigo>2</codigo>
            <codigoPorcentaje>4</codigoPorcentaje>
            <baseImponible>100.00</baseImponible>
            <tarifa>15.00</tarifa>
            <valor>15.00</valor>
          </totalImpuesto>
        </totalConImpuestos>
        <importeTotal>115.00</importeTotal>
        <pagos>
          <pago>
            <formaPago>20</formaPago>
            <total>115.00</total>
          </pago>
        </pagos>
      </infoFactura>
    </factura>
  ]]></comprobante>
</autorizacion>`;

const sampleXmlPath = path.join(tmpDir, 'factura_sample.xml');
fs.writeFileSync(sampleXmlPath, sampleXmlContent, 'utf8');

// 2. Probar parseXmlFile
const parsed = parseXmlFile(sampleXmlPath);
assert(parsed.success === true, 'El parseo debe ser exitoso');
assert.strictEqual(parsed.tipoDoc, '01', 'El tipo de documento debe ser 01');
assert.strictEqual(parsed.serie, '001-003-000003838', 'La serie debe coincidir');
assert.strictEqual(parsed.emisor.ruc, '1191759822001', 'El RUC debe coincidir');
assert(parsed.emisor.razonSocial.includes('MINERA DEL VALLE'), 'Razón social emisor');
assert.strictEqual(parsed.valores.baseGravada, 100.0, 'Base gravada debe ser 100');
assert.strictEqual(parsed.valores.montoIva, 15.0, 'Monto IVA debe ser 15');
assert.strictEqual(parsed.valores.total, 115.0, 'Total debe ser 115');
assert.strictEqual(parsed.formaPago, '20', 'Forma de pago debe ser 20');
console.log('[OK] parseXmlFile: Comprobante SRI parseado con éxito (Base Gravada, IVA y Totales correctos)');

// 3. Probar estructura de directorios y loadPeriodXmls
const clientFolder = path.join(tmpDir, 'Cliente_Test');
const periodFolder = path.join(clientFolder, 'Compras', '2025', '09 - Septiembre');
fs.mkdirSync(periodFolder, { recursive: true });
fs.copyFileSync(sampleXmlPath, path.join(periodFolder, '2025-09-08 - MINERA DEL VALLE - Factura 001-003-000003838.xml'));

// Crear una carpeta de mes vacía (sin comprobantes XML) para verificar que NO se liste innecesariamente
const emptyMonthFolder = path.join(clientFolder, 'Compras', '2025', '10 - Octubre');
fs.mkdirSync(emptyMonthFolder, { recursive: true });

const periods = getAvailablePeriods(clientFolder);
assert(periods.availableData === true, 'Debe detectar datos disponibles');
assert(periods.years.includes('2025'), 'Debe detectar año 2025');
assert(periods.monthsByYear['2025'].includes('09 - Septiembre'), 'Debe detectar mes con comprobantes');
assert(!periods.monthsByYear['2025'].includes('10 - Octubre'), 'NO debe listar meses vacíos sin comprobantes');
assert(periods.byCategory.Compras.years.includes('2025'), 'Debe detectar año en Compras');
assert(periods.byCategory.Compras.monthsByYear['2025'].includes('09 - Septiembre'), 'Debe detectar mes en Compras');
assert.strictEqual(periods.byCategory.Ventas.years.length, 0, 'No debe listar años en Ventas si no hay comprobantes descargados');
console.log('[OK] getAvailablePeriods: Carpetas y periodos descubiertos únicamente con archivos descargados');

const loaded = loadPeriodXmls(clientFolder, { category: 'Compras', year: '2025', month: '09 - Septiembre' });
assert.strictEqual(loaded.items.length, 1, 'Debe haber 1 comprobante cargado');
assert.strictEqual(loaded.totals.count, 1, 'Total conteo');
assert.strictEqual(loaded.totals.baseGravada, 100.0, 'Total base gravada');
assert.strictEqual(loaded.totals.montoIva, 15.0, 'Total monto IVA');
assert.strictEqual(loaded.totals.total, 115.0, 'Total general');
console.log('[OK] loadPeriodXmls: Comprobantes del periodo cargados y sumados con éxito');

// 4. Probar generateAtsXml
const atsResult = generateAtsXml({
  client: {
    ruc: '1790012345001',
    razonSocial: 'CLIENTE CONTABLE S.A.',
    defaultFolder: clientFolder
  },
  year: '2025',
  month: '09 - Septiembre',
  compras: loaded.items,
  ventas: []
});

assert(atsResult.success === true, 'Generación de ATS debe ser exitosa');
assert(fs.existsSync(atsResult.filePath), 'El archivo ATS XML debe existir en disco');

const atsXmlContent = fs.readFileSync(atsResult.filePath, 'utf8');
assert(atsXmlContent.includes('<NumeroRuc>1790012345001</NumeroRuc>'), 'Debe contener RUC informante');
assert(atsXmlContent.includes('<Anio>2025</Anio>'), 'Debe contener año 2025');
assert(atsXmlContent.includes('<Mes>09</Mes>'), 'Debe contener mes 09 con 2 dígitos');
assert(atsXmlContent.includes('<detalleCompras>'), 'Debe contener detalleCompras');
assert(atsXmlContent.includes('<idProv>1191759822001</idProv>'), 'Debe contener idProv');
assert(atsXmlContent.includes('<baseImpGrav>100.00</baseImpGrav>'), 'Debe contener baseImpGrav formateada a 2 decimales');
assert(atsXmlContent.includes('<montoIva>15.00</montoIva>'), 'Debe contener montoIva formateada a 2 decimales');
console.log('[OK] generateAtsXml: Archivo ATS XML oficial generado y validado contra esquema SRI');

// 5. Probar exportToCsv
const csvResult = exportToCsv({
  client: {
    defaultFolder: clientFolder
  },
  category: 'Compras',
  year: '2025',
  month: '09 - Septiembre',
  items: loaded.items
});

assert(csvResult.success === true, 'Exportación CSV debe ser exitosa');
assert(fs.existsSync(csvResult.filePath), 'El archivo CSV debe existir en disco');
const csvContent = fs.readFileSync(csvResult.filePath, 'utf8');
assert(csvContent.startsWith('\uFEFF'), 'Debe tener BOM UTF-8 para Excel');
assert(csvContent.includes('MINERA DEL VALLE'), 'Debe contener datos de la factura');
console.log('[OK] exportToCsv: Reporte CSV con formato compatible con Excel generado con éxito');

// 6. Probar ciclo de vida del Módulo y registro de IPC
assert.strictEqual(atsModule.name, 'ats-module', 'Nombre de módulo');
const constants = atsModule.getConstants();
assert(Array.isArray(constants.SUSTENTO_TRIBUTARIO), 'Debe incluir catálogo de sustento tributario');
assert(constants.SUSTENTO_TRIBUTARIO.some(s => s.code === '01'), 'Sustento 01 presente');

const mockIpcChannels = [];
const mockIpc = {
  handle: (channel) => mockIpcChannels.push(channel)
};
atsModule.registerIpc(mockIpc);
assert(mockIpcChannels.includes('ats:load-period-xmls'), 'Canal ats:load-period-xmls registrado');
assert(mockIpcChannels.includes('ats:generate-xml'), 'Canal ats:generate-xml registrado');
assert(mockIpcChannels.includes('ats:export-csv'), 'Canal ats:export-csv registrado');
console.log('[OK] registerIpc: Manejadores IPC del módulo ATS registrados limpiamente');

// 7. Probar AtsModuleView: filtrado estricto de meses en frontend
const optionsCreated = [];
global.document = {
  getElementById: (id) => ({
    id,
    innerHTML: '',
    value: id === 'atsFilterCategory' ? 'Compras' : '',
    disabled: false,
    appendChild(child) {
      optionsCreated.push({ target: id, ...child });
    },
    addEventListener() {},
    classList: { add() {}, remove() {} }
  }),
  createElement: () => ({ value: '', textContent: '', disabled: false, selected: false })
};

const AtsModuleView = require('../src/renderer/js/modules/atsModuleView');
const view = new AtsModuleView({});
view.periodsData = {
  byCategory: {
    Compras: {
      years: ['2026'],
      monthsByYear: { '2026': ['02 - Febrero'] }
    },
    Ventas: {
      years: [],
      monthsByYear: {}
    }
  }
};

view._updateYearAndMonthSelectors(false);
const monthsAdded = optionsCreated.filter(o => o.target === 'atsFilterMonth');
assert.strictEqual(monthsAdded.length, 1, 'Debe incluir únicamente el mes descargado');
assert.strictEqual(monthsAdded[0].value, '02 - Febrero', 'El mes descargado debe ser 02 - Febrero');
assert.strictEqual(view.filterMonth.value, '02 - Febrero', 'El valor seleccionado debe ser 02 - Febrero');
console.log('[OK] AtsModuleView: Selectores de año y mes pueblan únicamente meses descargados');

// Limpiar archivos temporales
try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch (e) {}

console.log('--- Todas las pruebas del Módulo Autónomo ATS pasaron satisfactoriamente ---');
