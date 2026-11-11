const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { TIPO_COMPROBANTE, TIPO_IDENTIFICACION_PROVEEDOR, TIPO_PROVEEDOR } = require('./constants');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false, // Preservar strings para evitar pérdida de ceros a la izquierda y precisión
  trimValues: true
});

/**
 * Normaliza números decimales desde texto XML a float seguro
 */
function toFloat(val) {
  if (!val) return 0.0;
  const num = parseFloat(String(val).replace(',', '.'));
  return isNaN(num) ? 0.0 : num;
}

/**
 * Formatea número a 2 decimales para ATS
 */
function to2Dec(val) {
  return toFloat(val).toFixed(2);
}

/**
 * Retorna el nombre legible del comprobante según su código SRI
 */
function getDocTypeName(codDoc) {
  return TIPO_COMPROBANTE[codDoc] || `Comprobante (${codDoc})`;
}

/**
 * Extrae y parsea el comprobante electrónico desde un archivo XML
 * Soporta formato con envoltorio <autorizacion> y formato directo firmado
 */
function parseXmlFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'El archivo no existe' };
    }

    const xmlContent = fs.readFileSync(filePath, 'utf8');
    let parsedObj = parser.parse(xmlContent);

    // Si viene dentro de <autorizacion><comprobante><![CDATA[...]]></comprobante></autorizacion>
    let innerXml = null;
    let fechaAutorizacion = '';
    let numeroAutorizacion = '';

    if (parsedObj.autorizacion) {
      const aut = parsedObj.autorizacion;
      numeroAutorizacion = aut.numeroAutorizacion || '';
      fechaAutorizacion = aut.fechaAutorizacion || '';

      if (typeof aut.comprobante === 'string') {
        innerXml = aut.comprobante;
        parsedObj = parser.parse(innerXml);
      } else if (aut.comprobante && typeof aut.comprobante['#text'] === 'string') {
        innerXml = aut.comprobante['#text'];
        parsedObj = parser.parse(innerXml);
      }
    }

    // Detectar el documento raíz
    let docType = 'desconocido';
    let doc = null;

    if (parsedObj.factura) {
      docType = '01'; // Factura
      doc = parsedObj.factura;
    } else if (parsedObj.notaCredito) {
      docType = '04'; // Nota de Crédito
      doc = parsedObj.notaCredito;
    } else if (parsedObj.notaDebito) {
      docType = '05'; // Nota de Débito
      doc = parsedObj.notaDebito;
    } else if (parsedObj.guiaRemision) {
      docType = '06'; // Guía de Remisión
      doc = parsedObj.guiaRemision;
    } else if (parsedObj.comprobanteRetencion) {
      docType = '07'; // Comprobante de Retención
      doc = parsedObj.comprobanteRetencion;
    } else if (parsedObj.liquidacionCompra) {
      docType = '03'; // Liquidación de Compra
      doc = parsedObj.liquidacionCompra;
    }

    if (!doc) {
      return {
        success: false,
        error: 'Estructura de comprobante electrónico SRI no reconocida',
        filePath
      };
    }

    const infoTributaria = doc.infoTributaria || {};
    const infoDoc = doc.infoFactura || doc.infoNotaCredito || doc.infoCompRetencion || doc.infoLiquidacionCompra || {};

    const claveAcceso = infoTributaria.claveAcceso || numeroAutorizacion || '';
    const codDoc = infoTributaria.codDoc || docType;
    const estab = String(infoTributaria.estab || '001').padStart(3, '0');
    const ptoEmi = String(infoTributaria.ptoEmi || '001').padStart(3, '0');
    const secuencial = String(infoTributaria.secuencial || '000000001').padStart(9, '0');
    const serie = `${estab}-${ptoEmi}-${secuencial}`;

    // Fecha de emisión
    let fechaEmision = infoDoc.fechaEmision || '';
    if (fechaEmision.includes('-')) {
      const parts = fechaEmision.split('-');
      if (parts[0].length === 4) {
        fechaEmision = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    // Desglose de Impuestos
    let base0 = 0.0;
    let baseGravada = 0.0;
    let baseNoObjeto = 0.0;
    let baseExenta = 0.0;
    let montoIva = 0.0;
    let montoIce = 0.0;
    let tarifaIvaPorcentaje = 0;

    const totalConImpuestos = infoDoc.totalConImpuestos;
    if (totalConImpuestos) {
      let taxItems = totalConImpuestos.totalImpuesto;
      if (!Array.isArray(taxItems)) {
        taxItems = taxItems ? [taxItems] : [];
      }

      for (const item of taxItems) {
        const codigo = String(item.codigo);
        const codPorc = String(item.codigoPorcentaje);
        const base = toFloat(item.baseImponible);
        const valor = toFloat(item.valor);

        if (codigo === '2') { // IVA
          if (codPorc === '0') {
            base0 += base;
          } else if (['2', '3', '4', '5', '10'].includes(codPorc)) {
            baseGravada += base;
            montoIva += valor;
            if (codPorc === '4') tarifaIvaPorcentaje = 15;
            else if (codPorc === '2') tarifaIvaPorcentaje = 12;
            else if (codPorc === '10') tarifaIvaPorcentaje = 13;
            else if (codPorc === '5') tarifaIvaPorcentaje = 5;
            else if (codPorc === '3') tarifaIvaPorcentaje = 14;
          } else if (codPorc === '6') {
            baseNoObjeto += base;
          } else if (codPorc === '7') {
            baseExenta += base;
          } else {
            base0 += base;
          }
        } else if (codigo === '3') { // ICE
          montoIce += valor;
        }
      }
    }

    // Importe total
    let total = toFloat(infoDoc.importeTotal || infoDoc.valorTotal);
    if (total === 0 && (base0 > 0 || baseGravada > 0 || montoIva > 0)) {
      total = base0 + baseGravada + montoIva + montoIce + baseNoObjeto + baseExenta;
    }

    // Formas de pago
    let formaPago = '20'; // Por defecto: Otros con utilización del sistema financiero
    if (infoDoc.pagos && infoDoc.pagos.pago) {
      let pagos = infoDoc.pagos.pago;
      if (!Array.isArray(pagos)) pagos = [pagos];
      if (pagos.length > 0 && pagos[0].formaPago) {
        formaPago = String(pagos[0].formaPago).padStart(2, '0');
      }
    }

    // Proveedor o Emisor
    const rucEmisor = infoTributaria.ruc || '';
    const razonSocialEmisor = infoTributaria.razonSocial || '';
    const nombreComercialEmisor = infoTributaria.nombreComercial || razonSocialEmisor;

    // Cliente o Comprador
    const idComprador = infoDoc.identificacionComprador || '';
    const razonSocialComprador = infoDoc.razonSocialComprador || '';
    const tipoIdComprador = infoDoc.tipoIdentificacionComprador || '04';

    // Determinar tipo de proveedor para ATS
    let tpIdProv = TIPO_IDENTIFICACION_PROVEEDOR.RUC;
    let tipoProv = TIPO_PROVEEDOR.PERSONA_NATURAL;
    if (rucEmisor.length === 10) {
      tpIdProv = TIPO_IDENTIFICACION_PROVEEDOR.CEDULA;
      tipoProv = TIPO_PROVEEDOR.PERSONA_NATURAL;
    } else if (rucEmisor.length === 13) {
      tpIdProv = TIPO_IDENTIFICACION_PROVEEDOR.RUC;
      const tercerDigito = parseInt(rucEmisor.charAt(2), 10);
      if (tercerDigito === 9 || tercerDigito === 6) {
        tipoProv = TIPO_PROVEEDOR.SOCIEDAD;
      } else {
        tipoProv = TIPO_PROVEEDOR.PERSONA_NATURAL;
      }
    } else {
      tpIdProv = TIPO_IDENTIFICACION_PROVEEDOR.PASAPORTE;
      tipoProv = TIPO_PROVEEDOR.PERSONA_NATURAL;
    }

    // Sustento tributario por defecto (01: Crédito tributario para declaración de IVA)
    const codSustento = '01';

    return {
      success: true,
      filePath,
      fileName: path.basename(filePath),
      tipoDoc: codDoc,
      tipoDocNombre: getDocTypeName(codDoc),
      claveAcceso,
      numeroAutorizacion: numeroAutorizacion || claveAcceso,
      fechaAutorizacion,
      serie,
      estab,
      ptoEmi,
      secuencial,
      fechaEmision,
      emisor: {
        ruc: rucEmisor,
        razonSocial: razonSocialEmisor,
        nombreComercial: nombreComercialEmisor,
        tpIdProv,
        tipoProv
      },
      comprador: {
        identificacion: idComprador,
        razonSocial: razonSocialComprador,
        tipoId: tipoIdComprador
      },
      valores: {
        base0: toFloat(base0),
        baseGravada: toFloat(baseGravada),
        baseNoObjeto: toFloat(baseNoObjeto),
        baseExenta: toFloat(baseExenta),
        montoIva: toFloat(montoIva),
        montoIce: toFloat(montoIce),
        tarifaIvaPorcentaje,
        total: toFloat(total)
      },
      codSustento,
      formaPago
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      filePath,
      fileName: path.basename(filePath)
    };
  }
}

function hasXmlFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return false;
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) return false;
    const files = fs.readdirSync(dirPath);
    return files.some(f => f.toLowerCase().endsWith('.xml'));
  } catch (e) {
    return false;
  }
}

function extractMonthNum(name) {
  const match = String(name).match(/\b(\d{1,2})\b/);
  return match ? parseInt(match[1], 10) : 999;
}

/**
 * Escanea la estructura de carpetas de un cliente para descubrir Años, Meses y Categorías disponibles
 * Filtrando estrictamente por carpetas que contengan archivos XML descargados.
 */
function getAvailablePeriods(clientFolder) {
  const result = {
    categories: ['Compras', 'Ventas'],
    years: [],
    monthsByYear: {},
    byCategory: {
      Compras: { years: [], monthsByYear: {} },
      Ventas: { years: [], monthsByYear: {} }
    },
    availableData: false
  };

  if (!clientFolder || !fs.existsSync(clientFolder)) {
    return result;
  }

  const allYearsSet = new Set();
  const allMonthsMap = {};

  // Función interna para registrar periodos detectados
  const registerPeriod = (cat, year, month) => {
    allYearsSet.add(year);
    if (!allMonthsMap[year]) allMonthsMap[year] = new Set();
    allMonthsMap[year].add(month);

    if (result.byCategory[cat]) {
      if (!result.byCategory[cat].monthsByYear[year]) {
        result.byCategory[cat].monthsByYear[year] = new Set();
      }
      result.byCategory[cat].monthsByYear[year].add(month);
    }
  };

  // 1. Escanear carpetas estándar estructuradas por categoría: Compras / Ventas
  for (const cat of ['Compras', 'Ventas']) {
    const catPath = path.join(clientFolder, cat);
    if (!fs.existsSync(catPath)) continue;

    try {
      const yearDirs = fs.readdirSync(catPath, { withFileTypes: true })
        .filter(d => d.isDirectory() && /^\d{4}$/.test(d.name))
        .map(d => d.name);

      for (const y of yearDirs) {
        const yearPath = path.join(catPath, y);
        let monthDirs = [];
        try {
          monthDirs = fs.readdirSync(yearPath, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);
        } catch (e) {
          continue;
        }

        // Filtrar estrictamente solo meses que tengan al menos 1 comprobante XML descargado
        const validMonths = monthDirs.filter(m => hasXmlFiles(path.join(yearPath, m)));
        for (const m of validMonths) {
          registerPeriod(cat, y, m);
        }
      }
    } catch (e) {
      console.error(`Error leyendo carpetas de periodos en ${cat}:`, e);
    }
  }

  // 2. Escanear si existen carpetas de año directamente en la raíz del cliente (ej: cliente/2026/Mes_11)
  try {
    const directYearDirs = fs.readdirSync(clientFolder, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d{4}$/.test(d.name))
      .map(d => d.name);

    for (const y of directYearDirs) {
      const yearPath = path.join(clientFolder, y);
      let monthDirs = [];
      try {
        monthDirs = fs.readdirSync(yearPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);
      } catch (e) {
        continue;
      }

      const validMonths = monthDirs.filter(m => hasXmlFiles(path.join(yearPath, m)));
      for (const m of validMonths) {
        registerPeriod('Compras', y, m);
      }
    }
  } catch (e) {}

  // 3. Estructurar y ordenar resultados finales
  for (const cat of ['Compras', 'Ventas']) {
    const catMap = result.byCategory[cat].monthsByYear;
    const catYears = Object.keys(catMap).sort((a, b) => b.localeCompare(a));
    result.byCategory[cat].years = catYears;
    const cleanMonthsByYear = {};
    for (const y of catYears) {
      cleanMonthsByYear[y] = Array.from(catMap[y] || []).sort(
        (a, b) => extractMonthNum(a) - extractMonthNum(b)
      );
    }
    result.byCategory[cat].monthsByYear = cleanMonthsByYear;
  }

  result.years = Array.from(allYearsSet).sort((a, b) => b.localeCompare(a));
  for (const y of result.years) {
    result.monthsByYear[y] = Array.from(allMonthsMap[y] || []).sort(
      (a, b) => extractMonthNum(a) - extractMonthNum(b)
    );
  }

  result.availableData = allYearsSet.size > 0;
  return result;
}

/**
 * Carga y procesa todos los archivos XML de un periodo específico (categoría, año, mes)
 * Soporta múltiples rutas y formatos de carpetas de forma transparente
 */
function loadPeriodXmls(clientFolderArg, optionsArg = {}) {
  let clientFolder = clientFolderArg;
  let options = optionsArg;

  if (typeof clientFolderArg === 'object' && clientFolderArg !== null && !optionsArg.year) {
    clientFolder = clientFolderArg.clientFolder;
    options = clientFolderArg;
  }

  const { category = 'Compras', year, month } = options;

  if (!clientFolder || !year || !month) {
    return { success: false, error: 'Faltan parámetros de cliente, año o mes', items: [] };
  }

  const monthNum = extractMonthNum(month);
  const pad = String(monthNum).padStart(2, '0');
  const monthNames = {
    '01': '01 - Enero', '02': '02 - Febrero', '03': '03 - Marzo', '04': '04 - Abril',
    '05': '05 - Mayo', '06': '06 - Junio', '07': '07 - Julio', '08': '08 - Agosto',
    '09': '09 - Septiembre', '10': '10 - Octubre', '11': '11 - Noviembre', '12': '12 - Diciembre'
  };
  const namedFolder = monthNames[pad] || `Mes_${pad}`;

  // Lista de posibles carpetas donde pueden residir los XML del periodo
  const candidatePaths = [
    path.join(clientFolder, category, String(year), String(month)),
    path.join(clientFolder, category, String(year), `Mes_${pad}`),
    path.join(clientFolder, category, String(year), namedFolder),
    path.join(clientFolder, String(year), String(month)),
    path.join(clientFolder, String(year), `Mes_${pad}`),
    path.join(clientFolder, String(year), namedFolder)
  ];

  let resolvedDir = null;
  for (const cand of candidatePaths) {
    if (fs.existsSync(cand) && hasXmlFiles(cand)) {
      resolvedDir = cand;
      break;
    }
  }

  if (!resolvedDir) {
    // Si ninguna tiene XMLs, usar la primera que exista o la ruta estándar
    resolvedDir = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
  }

  if (!fs.existsSync(resolvedDir)) {
    return {
      success: true,
      category,
      year,
      month,
      targetPath: resolvedDir,
      items: [],
      totals: { count: 0, base0: 0, baseGravada: 0, montoIva: 0, total: 0 }
    };
  }

  const files = fs.readdirSync(resolvedDir)
    .filter(f => f.toLowerCase().endsWith('.xml'));

  const parsedItems = [];
  let totalBase0 = 0;
  let totalBaseGravada = 0;
  let totalMontoIva = 0;
  let totalMontoIce = 0;
  let totalGeneral = 0;

  for (const file of files) {
    const fullPath = path.join(resolvedDir, file);
    const parsed = parseXmlFile(fullPath);
    if (parsed.success) {
      parsedItems.push(parsed);
      totalBase0 += parsed.valores.base0;
      totalBaseGravada += parsed.valores.baseGravada;
      totalMontoIva += parsed.valores.montoIva;
      totalMontoIce += parsed.valores.montoIce;
      totalGeneral += parsed.valores.total;
    }
  }

  // Ordenar cronológicamente por fecha de emisión
  parsedItems.sort((a, b) => {
    return (a.fechaEmision || '').localeCompare(b.fechaEmision || '');
  });

  return {
    success: true,
    category,
    year,
    month,
    targetPath: resolvedDir,
    items: parsedItems,
    totals: {
      count: parsedItems.length,
      base0: parseFloat(totalBase0.toFixed(2)),
      baseGravada: parseFloat(totalBaseGravada.toFixed(2)),
      montoIva: parseFloat(totalMontoIva.toFixed(2)),
      montoIce: parseFloat(totalMontoIce.toFixed(2)),
      total: parseFloat(totalGeneral.toFixed(2))
    }
  };
}

module.exports = {
  parseXmlFile,
  loadPeriodXmls,
  getAvailablePeriods,
  getDocTypeName,
  to2Dec,
  toFloat
};
