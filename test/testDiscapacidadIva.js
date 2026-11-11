const assert = require('assert');
const sriAutomation = require('../src/injected/sriAutomation');

console.log('--- Probando Asistente de Ajuste de IVA por Discapacidad SRI ---');

// 1. Validar generación de scripts
const inspectScript = sriAutomation.getInspectDiscapacidadTableScript();
assert(typeof inspectScript === 'string', 'Inspect script debe ser un string');
assert(inspectScript.includes('iva solicitado'), 'Debe buscar IVA solicitado');
assert(inspectScript.includes('monto iva'), 'Debe buscar Monto IVA');
console.log('[OK] Script de inspección de tabla de reclamo de IVA validado');

const applyScript = sriAutomation.getApplyDiscapacidadIvaScript({
  porcentaje: 60,
  tipoGasto: 'Alimentación',
  checkAll: true
});
assert(typeof applyScript === 'string', 'Apply script debe ser un string');
assert(applyScript.includes('"porcentaje":60'), 'Debe contener el porcentaje del 60%');
assert(applyScript.includes('"tipoGasto":"Alimentación"'), 'Debe contener tipo de gasto');
assert(applyScript.includes('nuevoIvaSolicitado'), 'Debe calcular nuevoIvaSolicitado');
console.log('[OK] Script de aplicación automática de IVA solicitado validado');

// 1.1 Validar script de Reclamo Automático por fila
const rowScript = sriAutomation.getProcessReclamoRowScript(0);
assert(typeof rowScript === 'string', 'ProcessReclamoRowScript debe ser un string');
assert(rowScript.includes('alimentación'), 'Debe predeterminar alimentación como tipo de gasto');
assert(rowScript.includes('inferTipoGasto'), 'Debe contener la función de inferencia inteligente');
assert(rowScript.includes('montoIvaVal'), 'Debe recuperar el monto de IVA');
assert(rowScript.includes('ui-selectonemenu'), 'Debe soportar componentes PrimeFaces');
assert(rowScript.includes('_panel'), 'Debe interactuar con el panel de opciones de PrimeFaces');
console.log('[OK] Script de Reclamo Automático por fila individual validado');

// 2. Simulación matemática de cálculo y redondeo según ley ecuatoriana
function calcularIvaSolicitado(montoIva, porcentaje) {
  const factor = porcentaje / 100.0;
  const raw = montoIva * factor;
  return (Math.round((raw + Number.EPSILON) * 100) / 100).toFixed(2);
}

// Caso 1: Imagen del usuario (Monto IVA: 0.19, Discapacidad 30% -> Reclamo 60%)
const caso1 = calcularIvaSolicitado(0.19, 60);
assert.strictEqual(caso1, '0.11', '0.19 * 60% debe ser 0.11');
console.log('[OK] Caso 1 (Factura TIA de 0.19 al 60%): $0.19 -> $' + caso1);

// Caso 2: Monto IVA 1.50 al 60%
const caso2 = calcularIvaSolicitado(1.50, 60);
assert.strictEqual(caso2, '0.90', '1.50 * 60% debe ser 0.90');
console.log('[OK] Caso 2 (Monto 1.50 al 60%): $1.50 -> $' + caso2);

// Caso 3: Monto IVA 12.35 al 70% (50% a 74% de discapacidad)
const caso3 = calcularIvaSolicitado(12.35, 70);
assert.strictEqual(caso3, '8.65', '12.35 * 70% debe ser 8.65');
console.log('[OK] Caso 3 (Monto 12.35 al 70%): $12.35 -> $' + caso3);

// Caso 4: Monto IVA 25.00 al 80% (75% a 84% de discapacidad)
const caso4 = calcularIvaSolicitado(25.00, 80);
assert.strictEqual(caso4, '20.00', '25.00 * 80% debe ser 20.00');
console.log('[OK] Caso 4 (Monto 25.00 al 80%): $25.00 -> $' + caso4);

// Caso 5: Monto IVA 100.00 al 100% (85% a 100% o tercera edad)
const caso5 = calcularIvaSolicitado(100.00, 100);
assert.strictEqual(caso5, '100.00', '100.00 al 100% debe ser 100.00');
console.log('[OK] Caso 5 (Monto 100.00 al 100%): $100.00 -> $' + caso5);

console.log('--- Todas las pruebas del Asistente de IVA por Discapacidad pasaron con éxito ---');
