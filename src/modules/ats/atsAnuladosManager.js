const fs = require('fs');
const path = require('path');

/**
 * Gestor de Comprobantes Anulados para ATS
 * TRIBU - Asistente Contable SRI Ecuador
 * 
 * Permite registrar y gestionar secuencias o comprobantes anulados requeridos
 * en la sección <anulados> del Anexo Transaccional Simplificado.
 */

function getAnuladosPath(clientFolder) {
  if (!clientFolder) return null;
  return path.join(clientFolder, 'ATS', 'anulados.json');
}

function loadAllAnulados(clientFolder) {
  try {
    const filePath = getAnuladosPath(clientFolder);
    if (!filePath || !fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error leyendo anulados.json:', err.message);
    return [];
  }
}

function saveAllAnulados(clientFolder, anulados) {
  try {
    const filePath = getAnuladosPath(clientFolder);
    if (!filePath) return false;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(anulados, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error guardando anulados.json:', err.message);
    return false;
  }
}

function extractMonthNumber(monthStr) {
  if (!monthStr) return '01';
  const match = String(monthStr).match(/\b(\d{1,2})\b/);
  return match ? match[1].padStart(2, '0') : '01';
}

function getAnuladosForPeriod(clientFolder, year, month) {
  const anulados = loadAllAnulados(clientFolder);
  const targetYear = String(year);
  const targetMonthNum = extractMonthNumber(month);

  return anulados.filter(a => {
    const aYear = String(a.year || '');
    const aMonth = extractMonthNumber(a.month || '');
    return aYear === targetYear && aMonth === targetMonthNum;
  });
}

function saveAnulado(clientFolder, data) {
  if (!clientFolder || !data) {
    return { success: false, error: 'Parámetros inválidos' };
  }

  const list = loadAllAnulados(clientFolder);
  const id = data.id || `ANUL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const item = {
    id,
    year: String(data.year || new Date().getFullYear()),
    month: extractMonthNumber(data.month),
    tipoComprobante: String(data.tipoComprobante || '01').padStart(2, '0'),
    establecimiento: String(data.establecimiento || '001').padStart(3, '0'),
    puntoEmision: String(data.puntoEmision || '001').padStart(3, '0'),
    secuencialInicio: parseInt(data.secuencialInicio, 10) || 1,
    secuencialFin: parseInt(data.secuencialFin, 10) || (parseInt(data.secuencialInicio, 10) || 1),
    autorizacion: String(data.autorizacion || '0000000000000000000000000000000000000000000000000').trim(),
    motivo: data.motivo || 'Comprobante anulado'
  };

  const existingIdx = list.findIndex(a => a.id === id);
  if (existingIdx >= 0) {
    list[existingIdx] = item;
  } else {
    list.push(item);
  }

  const saved = saveAllAnulados(clientFolder, list);
  return { success: saved, item };
}

function deleteAnulado(clientFolder, id) {
  if (!clientFolder || !id) {
    return { success: false, error: 'Parámetros inválidos' };
  }

  let list = loadAllAnulados(clientFolder);
  const initLen = list.length;
  list = list.filter(a => a.id !== id);

  if (list.length === initLen) {
    return { success: false, error: 'Registro no encontrado' };
  }

  const saved = saveAllAnulados(clientFolder, list);
  return { success: saved };
}

module.exports = {
  loadAllAnulados,
  getAnuladosForPeriod,
  saveAnulado,
  deleteAnulado
};
