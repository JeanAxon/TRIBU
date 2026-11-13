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
assert(fs.existsSync(atsResult.zipFilePath), 'El paquete oficial ATS ZIP debe existir en disco');
assert.strictEqual(atsResult.zipFileName, 'AT092025.zip', 'El nombre del ZIP debe cumplir la norma SRI ATmmaaaa.zip');
assert(atsResult.zipSizeBytes > 0 && atsResult.withinSizeLimit, 'El tamaño del ZIP debe ser menor a 8 MB');
assert(atsResult.validation && atsResult.validation.isValid, 'La validación previa debe ser exitosa');

const atsXmlContent = fs.readFileSync(atsResult.filePath, 'utf8');
assert(atsXmlContent.includes('<NumeroRuc>1790012345001</NumeroRuc>'), 'Debe contener RUC informante');
assert(atsXmlContent.includes('<Anio>2025</Anio>'), 'Debe contener año 2025');
assert(atsXmlContent.includes('<Mes>09</Mes>'), 'Debe contener mes 09 con 2 dígitos');
assert(atsXmlContent.includes('<detalleCompras>'), 'Debe contener detalleCompras');
assert(atsXmlContent.includes('<idProv>1191759822001</idProv>'), 'Debe contener idProv');
assert(atsXmlContent.includes('<baseImpGrav>100.00</baseImpGrav>'), 'Debe contener baseImpGrav formateada a 2 decimales');
assert(atsXmlContent.includes('<montoIva>15.00</montoIva>'), 'Debe contener montoIva formateada a 2 decimales');
console.log('[OK] generateAtsXml: Archivo ATS XML y paquete ZIP oficial generados y validados contra esquema SRI');

// 4.1 Probar validación normativa específica
const valOk = atsModule.validateAtsData({
  client: { ruc: '1790012345001' },
  year: '2025',
  month: '09',
  compras: loaded.items,
  ventas: []
});
assert.strictEqual(valOk.isValid, true, 'Validación con datos correctos');

const valInvalida = atsModule.validateAtsData({
  client: { ruc: '123' },
  year: '1999',
  month: '15',
  compras: [],
  ventas: []
});
assert.strictEqual(valInvalida.isValid, false, 'Validación debe fallar con RUC corto y mes 15');
assert(valInvalida.errors.length >= 2, 'Debe reportar múltiples errores de esquema');
console.log('[OK] validateAtsData: Reglas técnicas de RUC, período y límites verificadas');

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
assert(mockIpcChannels.includes('ats:validate-period'), 'Canal ats:validate-period registrado');
assert(mockIpcChannels.includes('ats:generate-xml'), 'Canal ats:generate-xml registrado');
assert(mockIpcChannels.includes('ats:export-csv'), 'Canal ats:export-csv registrado');
console.log('[OK] registerIpc: Manejadores IPC del módulo ATS registrados limpiamente');

// 7. Probar AtsModuleView: filtrado estricto de meses en frontend
const optionsCreated = [];
global.document = {
  querySelectorAll: () => [],
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

// 8. Probar generación y validación de ATS en CEROS (sin movimiento)
const valCeros = atsModule.validateAtsData({
  client: { ruc: '1790012345001' },
  year: '2026',
  month: '03 - Marzo',
  compras: [],
  ventas: []
});
assert.strictEqual(valCeros.isValid, true, 'ATS en ceros debe ser técnicamente válido');
assert.strictEqual(valCeros.summary.sinMovimiento, true, 'Debe marcarse como sinMovimiento');
assert.strictEqual(valCeros.summary.totalCompras, 0, 'Cero compras');
assert.strictEqual(valCeros.summary.totalVentas, 0, 'Cero ventas');

const cerosGenResult = generateAtsXml({
  client: {
    ruc: '1790012345001',
    razonSocial: 'EMPRESA SIN MOVIMIENTO CIA. LTDA.',
    defaultFolder: clientFolder
  },
  year: '2026',
  month: '03 - Marzo',
  compras: [],
  ventas: []
});

assert.strictEqual(cerosGenResult.success, true, 'Generación de ATS en ceros debe ser exitosa');
assert(fs.existsSync(cerosGenResult.filePath), 'El archivo XML en ceros debe existir');
assert(fs.existsSync(cerosGenResult.zipFilePath), 'El archivo ZIP oficial AT032026.zip debe existir');

const xmlCerosContent = fs.readFileSync(cerosGenResult.filePath, 'utf8');
assert(xmlCerosContent.includes('<totalVentas>0.00</totalVentas>'), 'totalVentas debe ser 0.00');
assert(xmlCerosContent.includes('<codEstab>001</codEstab>'), 'codEstab debe ser 001');
assert(xmlCerosContent.includes('<ventasEst>0.00</ventasEst>'), 'ventasEst debe ser 0.00');
assert(!xmlCerosContent.includes('<compras>'), 'No debe incluir sección compras en ceros');
assert(!xmlCerosContent.includes('<ventas>'), 'No debe incluir sección ventas en ceros');
console.log('[OK] generateAtsXml y validateAtsData: ATS en CEROS (sin movimiento) generado y empaquetado en AT032026.zip');

// 9. Probar selector con checkbox "Todos los meses" activado en AtsModuleView
optionsCreated.length = 0;
view.chkShowAllMonthsAts = { checked: true };
view._updateMonthSelector(false);
const allMonthsAdded = optionsCreated.filter(o => o.target === 'atsFilterMonth');
assert.strictEqual(allMonthsAdded.length, 12, 'Debe incluir los 12 meses cuando chkShowAllMonthsAts está activo');
assert(allMonthsAdded.some(m => m.textContent.includes('(En cero)')), 'Meses sin comprobantes deben rotularse (En cero)');
console.log('[OK] AtsModuleView: Modo "Todos los meses" despliega los 12 meses permitiendo selección en ceros');

// 10. Probar parseXmlFile con Comprobante de Retención (07)
const sampleRetencionXml = `<?xml version="1.0" encoding="UTF-8"?>
<comprobanteRetencion id="comprobante" version="1.0.0">
  <infoTributaria>
    <ambiente>2</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>AGENCIA DE RETENCION CIA. LTDA.</razonSocial>
    <ruc>1792003004001</ruc>
    <claveAcceso>1510202507179200300400120010020000009991234567812</claveAcceso>
    <codDoc>07</codDoc>
    <estab>001</estab>
    <ptoEmi>002</ptoEmi>
    <secuencial>000000999</secuencial>
  </infoTributaria>
  <infoCompRetencion>
    <fechaEmision>15/10/2025</fechaEmision>
    <obligadoContabilidad>SI</obligadoContabilidad>
    <tipoIdentificacionSujetoRetenido>04</tipoIdentificacionSujetoRetenido>
    <razonSocialSujetoRetenido>PROVEEDOR TEST S.A.</razonSocialSujetoRetenido>
    <identificacionSujetoRetenido>1790012345001</identificacionSujetoRetenido>
    <periodoFiscal>10/2025</periodoFiscal>
  </infoCompRetencion>
  <impuestos>
    <impuesto>
      <codigo>1</codigo>
      <codigoRetencion>312</codigoRetencion>
      <baseImponible>200.00</baseImponible>
      <porcentajeRetener>1.75</porcentajeRetener>
      <valorRetenido>3.50</valorRetenido>
      <codDocSustento>01</codDocSustento>
      <numDocSustento>001003000003838</numDocSustento>
      <fechaEmisionDocSustento>08/09/2025</fechaEmisionDocSustento>
    </impuesto>
    <impuesto>
      <codigo>2</codigo>
      <codigoRetencion>1</codigoRetencion>
      <baseImponible>30.00</baseImponible>
      <porcentajeRetener>30</porcentajeRetener>
      <valorRetenido>9.00</valorRetenido>
      <codDocSustento>01</codDocSustento>
      <numDocSustento>001003000003838</numDocSustento>
      <fechaEmisionDocSustento>08/09/2025</fechaEmisionDocSustento>
    </impuesto>
  </impuestos>
</comprobanteRetencion>`;

const sampleRetPath = path.join(tmpDir, 'retencion_sample.xml');
fs.writeFileSync(sampleRetPath, sampleRetencionXml, 'utf8');

const parsedRet = parseXmlFile(sampleRetPath);
assert.strictEqual(parsedRet.success, true, 'Parseo de retención exitoso');
assert.strictEqual(parsedRet.tipoDoc, '07', 'Tipo doc 07 comprobante de retención');
assert.strictEqual(parsedRet.retencionesRenta.length, 1, '1 retención en la fuente AIR');
assert.strictEqual(parsedRet.retencionesRenta[0].codRetAir, '312', 'Código AIR 312');
assert.strictEqual(parsedRet.retencionesRenta[0].valRetAir, 3.5, 'Valor retenido AIR $3.50');
assert.strictEqual(parsedRet.retencionesIva.length, 1, '1 retención de IVA');
assert.strictEqual(parsedRet.retencionesIva[0].valorRetenido, 9.0, 'Valor retenido IVA $9.00');
assert.strictEqual(parsedRet.totalesRetencion.totalRetenido, 12.5, 'Total retenido $12.50');
console.log('[OK] parseXmlFile (Retenciones 07): Desglose AIR y retenciones de IVA extraído con éxito');

// 11. Probar parseXmlFile con Nota de Crédito (04) y extracción de documento modificado
const sampleNcXml = `<?xml version="1.0" encoding="UTF-8"?>
<notaCredito id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>2</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>PROVEEDOR EMISOR S.A.</razonSocial>
    <ruc>1790011223001</ruc>
    <claveAcceso>2010202504179001122300120010010000000551234567819</claveAcceso>
    <codDoc>04</codDoc>
    <estab>001</estab>
    <ptoEmi>001</ptoEmi>
    <secuencial>000000055</secuencial>
  </infoTributaria>
  <infoNotaCredito>
    <fechaEmision>20/10/2025</fechaEmision>
    <tipoIdentificacionComprador>04</tipoIdentificacionComprador>
    <razonSocialComprador>CLIENTE CONTABLE S.A.</razonSocialComprador>
    <identificacionComprador>1790012345001</identificacionComprador>
    <codDocModificado>01</codDocModificado>
    <numDocModificado>001-003-000003838</numDocModificado>
    <fechaEmisionDocSustento>08/09/2025</fechaEmisionDocSustento>
    <totalSinImpuestos>20.00</totalSinImpuestos>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>4</codigoPorcentaje>
        <baseImponible>20.00</baseImponible>
        <valor>3.00</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <motivo>Descuento comercial posterior a la factura</motivo>
  </infoNotaCredito>
</notaCredito>`;

const sampleNcPath = path.join(tmpDir, 'nc_sample.xml');
fs.writeFileSync(sampleNcPath, sampleNcXml, 'utf8');

const parsedNc = parseXmlFile(sampleNcPath);
assert.strictEqual(parsedNc.success, true, 'Parseo de nota de crédito exitoso');
assert.strictEqual(parsedNc.tipoDoc, '04', 'Tipo doc 04');
assert.strictEqual(parsedNc.docModificado, '01', 'Documento modificado 01 (Factura)');
assert.strictEqual(parsedNc.numDocModificado, '001-003-000003838', 'Número doc modificado');
assert.strictEqual(parsedNc.estabModificado, '001', 'Estab modificado');
assert.strictEqual(parsedNc.secModificado, '000003838', 'Secuencial modificado');
console.log('[OK] parseXmlFile (Nota de Crédito 04): Vinculación de documento modificado validada');

// 12. Probar generateAtsXml con retenciones AIR y de IVA en compras
const atsConRetenciones = generateAtsXml({
  client: {
    ruc: '1790012345001',
    razonSocial: 'CLIENTE CONTABLE S.A.',
    defaultFolder: clientFolder
  },
  year: '2025',
  month: '09 - Septiembre',
  compras: [{
    tipoDoc: '01',
    estab: '001',
    ptoEmi: '003',
    secuencial: '000003838',
    claveAcceso: '0809202501119175982200120010030000038381190081716',
    fechaEmision: '08/09/2025',
    emisor: { ruc: '1191759822001', razonSocial: 'MINERA DEL VALLE' },
    valores: { baseGravada: 100.0, base0: 0.0, montoIva: 15.0, total: 115.0 },
    codSustento: '01',
    formaPago: '20',
    valorRetBienes: 4.50, // 30% IVA
    retencionesAir: [{
      codRetAir: '312',
      baseImpAir: 100.0,
      porcentajeAir: 1.75,
      valRetAir: 1.75
    }],
    retencionDoc: {
      estab: '001',
      ptoEmi: '001',
      secuencial: '000000001',
      claveAcceso: '0809202507179001234500120010010000000011234567813',
      fechaEmision: '08/09/2025'
    }
  }],
  ventas: []
});

assert.strictEqual(atsConRetenciones.success, true, 'Generación de ATS con retenciones exitosa');
const xmlRetContent = fs.readFileSync(atsConRetenciones.filePath, 'utf8');
assert(xmlRetContent.includes('<valorRetBienes>4.50</valorRetBienes>'), 'Debe incluir valorRetBienes 4.50');
assert(xmlRetContent.includes('<air>'), 'Debe incluir bloque <air>');
assert(xmlRetContent.includes('<codRetAir>312</codRetAir>'), 'Debe incluir codRetAir 312');
assert(xmlRetContent.includes('<valRetAir>1.75</valRetAir>'), 'Debe incluir valRetAir 1.75');
assert(xmlRetContent.includes('<secRetencion1>000000001</secRetencion1>'), 'Debe incluir secRetencion1');
console.log('[OK] generateAtsXml: Bloque AIR y retenciones de IVA generadas e integradas al ATS');

// 13. Probar Gestor de Comprobantes Físicos (atsPhysicalDocsManager)
const physicalDocsManager = require('../src/modules/ats/atsPhysicalDocsManager');
const savePhysRes = physicalDocsManager.savePhysicalDoc(clientFolder, {
  tipoDoc: '02',
  fechaEmision: '10/09/2025',
  year: '2025',
  month: '09',
  ruc: '1790055443001',
  razonSocial: 'TIENDA DON PEPE RIMPE POPULAR',
  serie: '001-001-000000123',
  autorizacion: '1122334455',
  base0: 25.0,
  baseGravada: 0.0,
  montoIva: 0.0,
  codSustento: '02',
  formaPago: '01'
});

assert.strictEqual(savePhysRes.success, true, 'Guardado de comprobante físico exitoso');
assert(savePhysRes.item && savePhysRes.item.id, 'Debe asignar ID al comprobante');
const loadedPhys = physicalDocsManager.getPhysicalDocsForPeriod(clientFolder, '2025', '09');
assert.strictEqual(loadedPhys.length, 1, 'Debe haber 1 comprobante físico en el período');
assert.strictEqual(loadedPhys[0].valores.base0, 25.0, 'Base 0 del comprobante físico');
assert.strictEqual(loadedPhys[0].esFisico, true, 'Marca esFisico true');

// Probar eliminación de comprobante físico
const delPhysRes = physicalDocsManager.deletePhysicalDoc(clientFolder, savePhysRes.item.id);
assert.strictEqual(delPhysRes.success, true, 'Eliminación de comprobante físico exitosa');
const loadedPhysAfter = physicalDocsManager.getPhysicalDocsForPeriod(clientFolder, '2025', '09');
assert.strictEqual(loadedPhysAfter.length, 0, 'No deben quedar comprobantes físicos');
console.log('[OK] atsPhysicalDocsManager: Registro, persistencia y eliminación de compras físicas validado');

// 14. Probar Gestor de Comprobantes Anulados (atsAnuladosManager)
const anuladosManager = require('../src/modules/ats/atsAnuladosManager');
const saveAnulRes = anuladosManager.saveAnulado(clientFolder, {
  year: '2025',
  month: '09',
  tipoComprobante: '01',
  establecimiento: '001',
  puntoEmision: '001',
  secuencialInicio: 10,
  secuencialFin: 12,
  autorizacion: '1122334455'
});
assert.strictEqual(saveAnulRes.success, true, 'Guardado de anulado exitoso');
const periodAnulados = anuladosManager.getAnuladosForPeriod(clientFolder, '2025', '09');
assert.strictEqual(periodAnulados.length, 1, 'Debe haber 1 rango de anulados');
assert.strictEqual(periodAnulados[0].secuencialInicio, 10, 'Secuencial inicio 10');
assert.strictEqual(periodAnulados[0].secuencialFin, 12, 'Secuencial fin 12');

const atsConAnulados = generateAtsXml({
  client: { ruc: '1790012345001', defaultFolder: clientFolder },
  year: '2025',
  month: '09',
  compras: [],
  ventas: [],
  anulados: periodAnulados
});
const xmlAnulContent = fs.readFileSync(atsConAnulados.filePath, 'utf8');
assert(xmlAnulContent.includes('<anulados>'), 'Debe incluir sección <anulados>');
assert(xmlAnulContent.includes('<secuencialInicio>10</secuencialInicio>'), 'Secuencial inicio 10 en XML');
assert(xmlAnulContent.includes('<secuencialFin>12</secuencialFin>'), 'Secuencial fin 12 en XML');
console.log('[OK] atsAnuladosManager y generateAtsXml: Registro y generación de <anulados> validado');

// 15. Probar Motor de Conciliación Tributaria (Punto G: ATS vs Formulario 104 y Formulario 103)
const taxReconciler = require('../src/modules/ats/taxReconciler');
const reconciliation = taxReconciler.reconcileAtsWithDeclaraciones({
  compras: [
    {
      tipoDoc: '01',
      valores: { baseGravada: 500.0, base0: 100.0, baseNoObjeto: 0.0, montoIva: 75.0, total: 675.0 },
      valorRetBienes: 22.50, // Retención IVA 30%
      retencionesAir: [{ codRetAir: '312', baseImpAir: 500.0, porcentajeAir: 1.75, valRetAir: 8.75 }]
    },
    {
      tipoDoc: '04', // Nota de crédito recibida que resta compras
      valores: { baseGravada: 50.0, base0: 0.0, baseNoObjeto: 0.0, montoIva: 7.50, total: 57.50 }
    }
  ],
  ventas: [
    {
      tipoDoc: '01',
      valores: { baseGravada: 1000.0, base0: 200.0, baseNoObjeto: 50.0, montoIva: 150.0, total: 1400.0 },
      valorRetIva: 30.0, // Retención IVA recibida de cliente (Crédito tributario casillero 601)
      valorRetRenta: 17.50
    }
  ]
});

assert.strictEqual(reconciliation.success, true, 'Conciliación exitosa');
const f104 = reconciliation.form104;
const c411Row = f104.rows.find(r => r.casillero === '411');
assert.strictEqual(c411Row.atsCalculado, 1000.0, 'Casillero 411: Ventas gravadas netas $1000');
const c413Row = f104.rows.find(r => r.casillero === '413');
assert.strictEqual(c413Row.atsCalculado, 200.0, 'Casillero 413: Ventas 0% netas $200');
const c421Row = f104.rows.find(r => r.casillero === '421');
assert.strictEqual(c421Row.atsCalculado, 150.0, 'Casillero 421: Total IVA ventas $150');

// Compras netas: 500 - 50 = 450
const c510Row = f104.rows.find(r => r.casillero === '510');
assert.strictEqual(c510Row.atsCalculado, 450.0, 'Casillero 510: Compras gravadas netas $450');
const c520Row = f104.rows.find(r => r.casillero === '520');
assert.strictEqual(c520Row.atsCalculado, 67.5, 'Casillero 520: Total IVA compras neto $67.50');

// Retenciones IVA recibidas casillero 601: 30.0
const c601Row = f104.rows.find(r => r.casillero === '601');
assert.strictEqual(c601Row.atsCalculado, 30.0, 'Casillero 601: Retenciones IVA efectuadas $30');

// Liquidación: IVA ventas (150) - IVA compras (67.5) - Retenciones (30) = 52.50 a pagar
const c605Row = f104.rows.find(r => r.casillero === '605');
assert.strictEqual(c605Row.atsCalculado, 52.5, 'Casillero 605: Impuesto a pagar $52.50');

// Formulario 103 (AIR)
const f103 = reconciliation.form103;
assert.strictEqual(f103.airRows.length, 1, '1 concepto AIR');
assert.strictEqual(f103.airRows[0].codigo, '312', 'Código AIR 312');
assert.strictEqual(f103.airRows[0].valorRetenidoAts, 8.75, 'Valor retenido AIR $8.75');
assert.strictEqual(f103.retencionesIvaEmitidas.ret30, 22.5, 'Retención IVA 30% $22.50');
assert.strictEqual(f103.resumen.totalPagarF103, 31.25, 'Total F103: Renta 8.75 + IVA 22.50 = $31.25');

console.log('[OK] taxReconciler (Punto G): Mapeo exacto de casilleros oficiales F104 y F103 con balance fiscal al centavo');

// Probar detección de discrepancias en conciliación
const discrepanciaTest = taxReconciler.reconcileAtsWithDeclaraciones({
  compras: [],
  ventas: [{ tipoDoc: '01', valores: { baseGravada: 1000.0, montoIva: 150.0 } }],
  form104Overrides: { '421': 140.0 } // Usuario declaró $140 en vez de $150
});
const row421 = discrepanciaTest.form104.rows.find(r => r.casillero === '421');
assert.strictEqual(row421.isBalanced, false, 'Debe detectar discrepancia en casillero 421');
assert.strictEqual(row421.diferencia, 10.0, 'Diferencia de $10.00 detectada');
assert.strictEqual(discrepanciaTest.globalStatus.isFullyBalanced, false, 'Estado global con discrepancias');
console.log('[OK] taxReconciler: Detección preventiva de discrepancias tributarias verificada con éxito');

// Limpiar archivos temporales
try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch (e) {}

console.log('--- Todas las pruebas del Módulo Autónomo ATS pasaron satisfactoriamente ---');
