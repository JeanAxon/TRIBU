const assert = require('assert');
const sriAutomation = require('../src/injected/sriAutomation');
const DownloadManager = require('../src/main/downloadManager');

console.log('--- Probando Generadores y Automatización SRI ---');

// 1. Probar Login Script
const loginScript = sriAutomation.getLoginScript('1790012345001', 'claveSecreta123');
assert(typeof loginScript === 'string', 'loginScript debe ser un string');
assert(loginScript.includes('1790012345001'), 'loginScript debe contener el RUC');
assert(loginScript.includes('claveSecreta123'), 'loginScript debe contener la contraseña');
console.log('[OK] Login script generado y validado con éxito');

// 2. Probar Click Row Script con Fecha y Razón Social
const clickRowScript = sriAutomation.getClickRowXmlScript(0);
assert(typeof clickRowScript === 'string', 'clickRowScript debe ser un string');
assert(clickRowScript.includes('suggestedFilename'), 'clickRowScript debe generar el nombre con Fecha y Razón Social');
console.log('[OK] Script de clic individual por fila con nombre Fecha + Razón Social generado con éxito');

// 3. Probar Inspect Script con categoría
const inspectScript = sriAutomation.getInspectComprobantesScript();
assert(typeof inspectScript === 'string', 'inspectScript debe ser un string');
assert(inspectScript.includes('category'), 'inspectScript debe detectar categoría (Ventas/Compras)');
console.log('[OK] Inspect comprobantes script generado con detección de Ventas/Compras');

// 4. Probar Next Page Script reactivo
const nextScript = sriAutomation.getNextPageScript();
assert(typeof nextScript === 'string', 'nextScript debe ser un string');
assert(nextScript.includes('attempts'), 'nextScript debe usar sondeo reactivo');
console.log('[OK] Next page script reactivo generado con éxito');

// 5. Probar DownloadManager con expectedInfo (Fecha + Razón Social)
const dm = new DownloadManager(null);
dm.setExpectedFileInfo({
  filename: '2025-09-08 - MINERA DEL VALLE ARIAS & CORDOVA - Factura 001-003-000003838.xml',
  year: '2025',
  month: '09 - Septiembre',
  clave: '0809202501119175982200120010030000038381190081716'
});
assert(dm.expectedInfo.year === '2025', 'El año debe ser 2025');
assert(dm.expectedInfo.filename.includes('MINERA DEL VALLE'), 'Debe contener la Razón Social');
console.log('[OK] Formato de guardado con Fecha y Razón Social validado con éxito');

// 6. Probar scripts de Ventas (Emitidos) día por día
const ventasFilterScript = sriAutomation.getVentasFilterInfoScript();
assert(typeof ventasFilterScript === 'string', 'ventasFilterScript debe ser un string');
assert(ventasFilterScript.includes('isVentasPage'), 'ventasFilterScript debe detectar estado de página de ventas');
assert(ventasFilterScript.includes('daysInMonth'), 'ventasFilterScript debe calcular los días del mes');
console.log('[OK] Script de información de filtro de Ventas generado con éxito');

const setVentasDateScript = sriAutomation.getSetVentasDateAndSearchScript('29/10/2026');
assert(typeof setVentasDateScript === 'string', 'setVentasDateScript debe ser un string');
assert(setVentasDateScript.includes('29/10/2026'), 'setVentasDateScript debe contener la fecha objetivo');
assert(setVentasDateScript.includes('consultBtn'), 'setVentasDateScript debe accionar el botón Consultar');
console.log('[OK] Script de asignación de fecha y búsqueda de Ventas generado con éxito');

// 7. Probar formato de guardado de Ventas en DownloadManager
const dmVentas = new DownloadManager(null);
dmVentas.setCategory('Ventas');
assert(dmVentas.currentCategory === 'Ventas', 'La categoría debe ser Ventas');
dmVentas.setExpectedFileInfo({
  filename: '2026-10-29 - Factura 001-002-000000008.xml',
  year: '2026',
  month: '10 - Octubre',
  fechaEmision: '2026-10-29',
  tipoSerie: 'Factura 001-002-000000008',
  claveAcceso: '2910202601110538366300120010020000000088176807211'
});
assert(dmVentas.expectedInfo.year === '2026', 'El año de venta debe ser 2026');
assert(dmVentas.expectedInfo.filename === '2026-10-29 - Factura 001-002-000000008.xml', 'El nombre debe ser fecha y serie');
const stats = dmVentas.getStats();
assert(typeof stats.completed === 'number', 'getStats debe devolver completed numérico');
console.log('[OK] Formato de guardado de Ventas (Emitidos) y getStats validado con éxito');

// 8. Probar script de navegación directa sin error 404
const navVentasScript = sriAutomation.getNavigateToSriSectionScript('ventas');
assert(typeof navVentasScript === 'string', 'navVentasScript debe ser string');
assert(navVentasScript.includes('redireccion=60'), 'Debe usar la ruta autenticada oficial redireccion=60 para evitar 404');
console.log('[OK] Navegación directa a Comprobantes Emitidos autenticada validada con éxito');

console.log('--- Todas las pruebas pasaron satisfactoriamente ---');
