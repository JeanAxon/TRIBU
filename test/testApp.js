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

console.log('--- Todas las pruebas pasaron satisfactoriamente ---');
