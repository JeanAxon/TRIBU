const assert = require('assert');
const path = require('path');
const fs = require('fs');
const atsModule = require('../src/modules/ats');

console.log('--- Probando Visor de Factura Digital y Extracción de Ítems XML ---');

// 1. Crear XML de prueba con estructura SRI completa (detalles, emisor, infoAdicional)
const sampleInvoiceXml = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>2</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>TIENDAS INDUSTRIALES ASOCIADAS TIA S.A.</razonSocial>
    <nombreComercial>TIA</nombreComercial>
    <ruc>0990017514001</ruc>
    <claveAcceso>1111202601099001751400120010020000123451234567819</claveAcceso>
    <codDoc>01</codDoc>
    <estab>001</estab>
    <ptoEmi>002</ptoEmi>
    <secuencial>000012345</secuencial>
    <dirMatriz>CHILE 201 Y LUQUE, GUAYAQUIL</dirMatriz>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>11/11/2026</fechaEmision>
    <dirEstablecimiento>AV. PRINCIPAL 123, LOJA</dirEstablecimiento>
    <obligadoContabilidad>SI</obligadoContabilidad>
    <tipoIdentificacionComprador>05</tipoIdentificacionComprador>
    <razonSocialComprador>RUIZ ESPINOZA JEAN PIERRE</razonSocialComprador>
    <identificacionComprador>1105383663</identificacionComprador>
    <totalSinImpuestos>10.00</totalSinImpuestos>
    <totalDescuento>1.00</totalDescuento>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>4</codigoPorcentaje>
        <baseImponible>10.00</baseImponible>
        <valor>1.50</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <propina>0.50</propina>
    <importeTotal>12.00</importeTotal>
    <pagos>
      <pago>
        <formaPago>20</formaPago>
        <total>12.00</total>
      </pago>
    </pagos>
  </infoFactura>
  <detalles>
    <detalle>
      <codigoPrincipal>ART-001</codigoPrincipal>
      <descripcion>LECHE ENTERA 1L</descripcion>
      <cantidad>2.00</cantidad>
      <precioUnitario>1.25</precioUnitario>
      <descuento>0.00</descuento>
      <precioTotalSinImpuesto>2.50</precioTotalSinImpuesto>
    </detalle>
    <detalle>
      <codigoPrincipal>ART-002</codigoPrincipal>
      <descripcion>ARROZ FLOR 5KG</descripcion>
      <cantidad>1.00</cantidad>
      <precioUnitario>7.50</precioUnitario>
      <descuento>1.00</descuento>
      <precioTotalSinImpuesto>7.50</precioTotalSinImpuesto>
    </detalle>
  </detalles>
  <infoAdicional>
    <campoAdicional nombre="Email">cliente@ejemplo.com</campoAdicional>
    <campoAdicional nombre="Observacion">Entrega en domicilio</campoAdicional>
  </infoAdicional>
</factura>`;

const tmpDir = path.join(require('os').tmpdir(), 'tribu_test_inv_' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });
const tmpXmlFile = path.join(tmpDir, 'factura_test.xml');
fs.writeFileSync(tmpXmlFile, sampleInvoiceXml, 'utf8');

try {
  const parsed = atsModule.parseXmlFile(tmpXmlFile);

  assert(parsed.success === true, 'El parseo debe ser exitoso');
  assert.strictEqual(parsed.serie, '001-002-000012345', 'Serie correcta');
  assert.strictEqual(parsed.emisor.ruc, '0990017514001', 'RUC emisor correcto');
  assert.strictEqual(parsed.emisor.obligadoContabilidad, 'SI', 'Obligado contabilidad correcto');
  assert.strictEqual(parsed.comprador.identificacion, '1105383663', 'Comprador cédula correcta');

  // Validar extracción de detalles / ítems para el visor RIDE
  assert(Array.isArray(parsed.detalles), 'parsed.detalles debe ser un array');
  assert.strictEqual(parsed.detalles.length, 2, 'Deben existir 2 ítems extraídos');
  assert.strictEqual(parsed.detalles[0].descripcion, 'LECHE ENTERA 1L', 'Descripción ítem 1');
  assert.strictEqual(parsed.detalles[0].cantidad, 2.0, 'Cantidad ítem 1');
  assert.strictEqual(parsed.detalles[1].descripcion, 'ARROZ FLOR 5KG', 'Descripción ítem 2');

  // Validar info adicional
  assert.strictEqual(parsed.infoAdicional.Email, 'cliente@ejemplo.com', 'Email adicional correcto');
  assert.strictEqual(parsed.infoAdicional.Observacion, 'Entrega en domicilio', 'Observación correcta');

  // Validar valores
  assert.strictEqual(parsed.valores.baseGravada, 10.0, 'Base gravada correcta');
  assert.strictEqual(parsed.valores.montoIva, 1.50, 'Monto IVA correcto');
  assert.strictEqual(parsed.valores.total, 12.00, 'Importe total correcto');
  assert.strictEqual(parsed.valores.totalSinImpuestos, 10.00, 'Total sin impuestos correcto');

  // Validar pagos estructurados
  assert(Array.isArray(parsed.pagos), 'parsed.pagos debe ser un array');
  assert.strictEqual(parsed.pagos.length, 1, 'Debe registrar 1 forma de pago');
  assert.strictEqual(parsed.pagos[0].formaPago, '20', 'Forma de pago 20');
  assert.strictEqual(parsed.pagos[0].total, 12.00, 'Monto de pago 12.00');

  console.log('[OK] Extracción de datos de factura SRI (ítems, adicionales, emisor, pagos) validada');

  // Validar renderizado RIDE formato simple SRI
  const AtsModuleView = require('../src/renderer/js/modules/atsModuleView');
  global.document = {
    getElementById: () => null,
    createElement: () => ({ appendChild() {} })
  };
  const view = new AtsModuleView({});

  // 1. Validar generador de código de barras Code 128
  const barcodeSvg = view._generateBarcodeSvg(parsed.claveAcceso);
  assert(barcodeSvg.startsWith('<svg'), 'Debe generar un SVG');
  assert(barcodeSvg.includes('<rect'), 'Debe contener barras rect');
  assert(barcodeSvg.includes('viewBox='), 'Debe tener atributo viewBox');
  console.log('[OK] Código de barras Code 128 oficial generado en SVG');

  // 2. Validar HTML de RIDE oficial del SRI
  const rideHtml = view._renderInvoiceRideHtml(parsed);
  assert(rideHtml.includes('ride-paper-sheet'), 'Debe usar la hoja de papel blanca');
  assert(rideHtml.includes('ride-sri-header-grid'), 'Debe tener la cabecera en dos columnas SRI');
  assert(rideHtml.includes('R.U.C.:'), 'Debe incluir el RUC');
  assert(rideHtml.includes('NÚMERO DE AUTORIZACIÓN:'), 'Debe incluir número de autorización');
  assert(rideHtml.includes('CLAVE DE ACCESO:'), 'Debe incluir clave de acceso');
  assert(rideHtml.includes('SUBTOTAL 15%:'), 'Debe incluir subtotal con tarifa');
  assert(rideHtml.includes('SUBTOTAL SIN IMPUESTOS:'), 'Debe incluir subtotal sin impuestos');
  assert(rideHtml.includes('VALOR TOTAL:'), 'Debe incluir valor total');
  assert(rideHtml.includes('LECHE ENTERA 1L'), 'Debe incluir detalle de ítem 1');
  assert(rideHtml.includes('ARROZ FLOR 5KG'), 'Debe incluir detalle de ítem 2');
  console.log('[OK] Renderizado RIDE simple en formato oficial SRI validado');

  // Validar que index.html contiene el modal flotante con acciones de impresión y copiado
  const htmlContent = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
  assert(htmlContent.includes('id="invoiceViewerModal"'), 'index.html debe tener invoiceViewerModal');
  assert(htmlContent.includes('id="invoiceViewerBody"'), 'index.html debe tener invoiceViewerBody');
  assert(htmlContent.includes('id="btnDismissInvoiceViewer"'), 'index.html debe tener btnDismissInvoiceViewer');
  assert(htmlContent.includes('id="btnInvoicePrint"'), 'index.html debe tener btnInvoicePrint');
  assert(htmlContent.includes('id="btnInvoiceCopyClave"'), 'index.html debe tener btnInvoiceCopyClave');
  assert(htmlContent.includes('id="btnInvoiceOpenFolder"'), 'index.html debe tener btnInvoiceOpenFolder');
  console.log('[OK] Estructura modal flotante y botones de impresión/copiado en index.html validados');

  console.log('--- Todas las pruebas del Visor de Factura pasaron con éxito ---');
} finally {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {}
}
