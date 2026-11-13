const fs = require('fs');
const path = require('path');

/**
 * Gestor de Comprobantes Físicos para ATS
 * TRIBU - Asistente Contable SRI Ecuador
 * 
 * Permite registrar y persistir comprobantes emitidos físicamente que no se descargan
 * electrónicamente desde el SRI (Notas de Venta RIMPE Negocios Populares, Peajes, etc.)
 */

function getPhysicalDocsPath(clientFolder) {
  if (!clientFolder) return null;
  return path.join(clientFolder, 'ATS', 'comprobantes_fisicos.json');
}

function loadAllPhysicalDocs(clientFolder) {
  try {
    const filePath = getPhysicalDocsPath(clientFolder);
    if (!filePath || !fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error leyendo comprobantes_fisicos.json:', err.message);
    return [];
  }
}

function saveAllPhysicalDocs(clientFolder, docs) {
  try {
    const filePath = getPhysicalDocsPath(clientFolder);
    if (!filePath) return false;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error guardando comprobantes_fisicos.json:', err.message);
    return false;
  }
}

function extractMonthNumber(monthStr) {
  if (!monthStr) return '01';
  const match = String(monthStr).match(/\b(\d{1,2})\b/);
  return match ? match[1].padStart(2, '0') : '01';
}

function getPhysicalDocsForPeriod(clientFolder, year, month) {
  const docs = loadAllPhysicalDocs(clientFolder);
  const targetYear = String(year);
  const targetMonthNum = extractMonthNumber(month);

  return docs.filter(d => {
    const docYear = String(d.year || (d.fechaEmision ? d.fechaEmision.split('/')[2] : ''));
    const docMonth = extractMonthNumber(d.month || (d.fechaEmision ? d.fechaEmision.split('/')[1] : ''));
    return docYear === targetYear && docMonth === targetMonthNum;
  });
}

function savePhysicalDoc(clientFolder, docData) {
  if (!clientFolder || !docData) {
    return { success: false, error: 'Parámetros inválidos' };
  }

  const docs = loadAllPhysicalDocs(clientFolder);
  const id = docData.id || `FIS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const numSerie = String(docData.serie || '001-001-000000001').trim();
  const serieParts = numSerie.split('-');
  const estab = serieParts[0] ? serieParts[0].padStart(3, '0') : '001';
  const ptoEmi = serieParts[1] ? serieParts[1].padStart(3, '0') : '001';
  const secuencial = serieParts[2] ? serieParts[2].padStart(9, '0') : '000000001';
  const serie = `${estab}-${ptoEmi}-${secuencial}`;

  const base0 = parseFloat(docData.base0) || 0.0;
  const baseGravada = parseFloat(docData.baseGravada) || 0.0;
  const baseNoObjeto = parseFloat(docData.baseNoObjeto) || 0.0;
  const baseExenta = parseFloat(docData.baseExenta) || 0.0;
  const montoIva = parseFloat(docData.montoIva) || 0.0;
  const total = parseFloat(docData.total) || (base0 + baseGravada + baseNoObjeto + baseExenta + montoIva);

  const newDoc = {
    id,
    esFisico: true,
    origen: 'Físico / Manual',
    tipoDoc: docData.tipoDoc || '02', // 02: Nota de venta, 01: Factura física
    tipoDocNombre: docData.tipoDoc === '01' ? 'Factura Física' : 'Nota de Venta (RIMPE / Físico)',
    claveAcceso: docData.autorizacion || '0000000000',
    numeroAutorizacion: docData.autorizacion || '0000000000',
    serie,
    estab,
    ptoEmi,
    secuencial,
    fechaEmision: docData.fechaEmision || new Date().toLocaleDateString('es-EC'),
    year: docData.year || String(new Date().getFullYear()),
    month: docData.month || extractMonthNumber(docData.fechaEmision),
    emisor: {
      ruc: (docData.ruc || '9999999999999').trim(),
      razonSocial: (docData.razonSocial || 'PROVEEDOR FÍSICO').trim(),
      tpIdProv: (docData.ruc && docData.ruc.length === 10) ? '02' : '01',
      tipoProv: (docData.ruc && docData.ruc.length === 13 && parseInt(docData.ruc.charAt(2), 10) >= 6) ? '02' : '01'
    },
    valores: {
      base0,
      baseGravada,
      baseNoObjeto,
      baseExenta,
      montoIva,
      montoIce: 0.0,
      total
    },
    codSustento: docData.codSustento || '01',
    formaPago: docData.formaPago || '01', // Sin utilización del sistema financiero por defecto para pagos físicos
    nota: docData.nota || ''
  };

  const existingIndex = docs.findIndex(d => d.id === id);
  if (existingIndex >= 0) {
    docs[existingIndex] = newDoc;
  } else {
    docs.push(newDoc);
  }

  const saved = saveAllPhysicalDocs(clientFolder, docs);
  return { success: saved, item: newDoc };
}

function deletePhysicalDoc(clientFolder, docId) {
  if (!clientFolder || !docId) {
    return { success: false, error: 'Parámetros inválidos' };
  }

  let docs = loadAllPhysicalDocs(clientFolder);
  const initialLength = docs.length;
  docs = docs.filter(d => d.id !== docId);

  if (docs.length === initialLength) {
    return { success: false, error: 'Comprobante no encontrado' };
  }

  const saved = saveAllPhysicalDocs(clientFolder, docs);
  return { success: saved };
}

module.exports = {
  loadAllPhysicalDocs,
  getPhysicalDocsForPeriod,
  savePhysicalDoc,
  deletePhysicalDoc,
  extractMonthNumber
};
