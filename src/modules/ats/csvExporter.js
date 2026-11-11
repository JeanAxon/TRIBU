const fs = require('fs');
const path = require('path');
const { to2Dec } = require('./xmlParser');
const { extractMonthNumber } = require('./atsGenerator');

function escapeQuotes(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '""');
}

/**
 * Exporta el listado de comprobantes cargados a formato CSV compatible con Microsoft Excel
 */
function exportToCsv({ client, category = 'Compras', year, month, items = [] }) {
  try {
    const month2Digits = extractMonthNumber(month);
    const yearStr = String(year);

    const headers = [
      'Nro',
      'Tipo Comprobante',
      'Fecha Emision',
      'Serie y Secuencial',
      'RUC / Identificacion Emisor',
      'Razon Social Emisor',
      'Sustento Tributario',
      'Subtotal Base 0%',
      'Subtotal Base Gravada',
      'Monto IVA',
      'Monto ICE',
      'Total',
      'Forma de Pago',
      'Clave de Acceso',
      'Archivo Origen'
    ];

    let csvContent = '\uFEFF'; // BOM UTF-8 para que Excel en Windows lo abra directamente con tildes y caracteres especiales
    csvContent += headers.join(';') + '\r\n';

    items.forEach((item, index) => {
      const emisor = item.emisor || {};
      const valores = item.valores || {};

      const row = [
        index + 1,
        `"${escapeQuotes(item.tipoDocNombre || 'Factura')}"`,
        `"${item.fechaEmision || ''}"`,
        `"${item.serie || ''}"`,
        `"${emisor.ruc || ''}"`,
        `"${escapeQuotes(emisor.razonSocial || '')}"`,
        `"${item.codSustento || '01'}"`,
        to2Dec(valores.base0 || 0),
        to2Dec(valores.baseGravada || 0),
        to2Dec(valores.montoIva || 0),
        to2Dec(valores.montoIce || 0),
        to2Dec(valores.total || 0),
        `"${item.formaPago || '20'}"`,
        `"${item.claveAcceso || ''}"`,
        `"${escapeQuotes(item.fileName || '')}"`
      ];
      csvContent += row.join(';') + '\r\n';
    });

    // Guardar en la subcarpeta Reportes del cliente
    const reportsDir = path.join(client.defaultFolder, 'Reportes');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const fileName = `Reporte_${category}_${month2Digits}_${yearStr}.csv`;
    const fullPath = path.join(reportsDir, fileName);
    fs.writeFileSync(fullPath, csvContent, 'utf8');

    return {
      success: true,
      fileName,
      filePath: fullPath,
      folderPath: reportsDir,
      rowCount: items.length
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  exportToCsv
};
