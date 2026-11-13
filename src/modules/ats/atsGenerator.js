const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { to2Dec, toFloat } = require('./xmlParser');
const { validateAtsData } = require('./atsValidator');
const { SRI_LIMITES } = require('./constants');

/**
 * Escapa caracteres especiales de XML según estándares W3C
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .trim();
}

/**
 * Extrae número de mes en formato 2 dígitos (ej: "09" desde "09 - Septiembre" o "9")
 */
function extractMonthNumber(monthStr) {
  if (!monthStr) return '01';
  const match = String(monthStr).match(/\b(\d{1,2})\b/);
  if (match) {
    return match[1].padStart(2, '0');
  }
  return '01';
}

/**
 * Calcula CRC-32 para el encabezado del archivo ZIP
 */
function calculateCrc32(buf) {
  let table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

/**
 * Crea un buffer de archivo ZIP estándar (PKZIP 2.0) conteniendo un archivo XML comprimido
 * Compatible al 100% con los sistemas de validación del SRI (RIG)
 */
function createZipBuffer(fileName, contentBuf) {
  const compBuf = zlib.deflateRawSync(contentBuf);
  const nameBuf = Buffer.from(fileName, 'utf8');
  const crc = calculateCrc32(contentBuf);
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

  // Encabezado local de archivo (Local File Header)
  const lh = Buffer.alloc(30 + nameBuf.length);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4); // Versión necesaria (2.0)
  lh.writeUInt16LE(0, 6);  // Flags
  lh.writeUInt16LE(8, 8);  // Método Deflate
  lh.writeUInt16LE(dosTime, 10);
  lh.writeUInt16LE(dosDate, 12);
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(compBuf.length, 18);
  lh.writeUInt32LE(contentBuf.length, 22);
  lh.writeUInt16LE(nameBuf.length, 26);
  lh.writeUInt16LE(0, 28);
  nameBuf.copy(lh, 30);

  // Encabezado del directorio central (Central Directory Header)
  const cdh = Buffer.alloc(46 + nameBuf.length);
  cdh.writeUInt32LE(0x02014b50, 0);
  cdh.writeUInt16LE(20, 4);
  cdh.writeUInt16LE(20, 6);
  cdh.writeUInt16LE(0, 8);
  cdh.writeUInt16LE(8, 10);
  cdh.writeUInt16LE(dosTime, 12);
  cdh.writeUInt16LE(dosDate, 14);
  cdh.writeUInt32LE(crc, 16);
  cdh.writeUInt32LE(compBuf.length, 20);
  cdh.writeUInt32LE(contentBuf.length, 24);
  cdh.writeUInt16LE(nameBuf.length, 28);
  cdh.writeUInt16LE(0, 30);
  cdh.writeUInt16LE(0, 32);
  cdh.writeUInt16LE(0, 34);
  cdh.writeUInt16LE(0, 36);
  cdh.writeUInt32LE(0, 38);
  cdh.writeUInt32LE(0, 42); // Offset del Local File Header
  nameBuf.copy(cdh, 46);

  // Fin del directorio central (End of Central Directory Record)
  const cdOffset = lh.length + compBuf.length;
  const cdSize = cdh.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([lh, compBuf, cdh, eocd]);
}

/**
 * Genera el XML y ZIP oficial del Anexo Transaccional Simplificado (ATS) SRI Ecuador
 */
function generateAtsXml({ client, year, month, compras = [], ventas = [], retenciones = [], comprobantesFisicos = [], anulados = [] }) {
  try {
    const month2Digits = extractMonthNumber(month);
    const yearStr = String(year);
    const rucInformante = client.ruc;
    const razonSocialInformante = escapeXml(client.razonSocial || client.name || 'CONTRIBUYENTE');

    // Cargar comprobantes anulados si no se pasaron explícitamente y el cliente tiene carpeta
    let anuladosList = Array.isArray(anulados) ? [...anulados] : [];
    if (anuladosList.length === 0 && client && client.defaultFolder) {
      try {
        const atsAnuladosManager = require('./atsAnuladosManager');
        anuladosList = atsAnuladosManager.getAnuladosForPeriod(client.defaultFolder, yearStr, month2Digits);
      } catch (e) {}
    }

    // Validación previa normativa
    const validation = validateAtsData({ client, year, month, compras, ventas });

    let totalVentas = 0.0;
    const estabSalesMap = {};

    for (const v of ventas) {
      const b0 = v.valores ? v.valores.base0 : 0;
      const bg = v.valores ? v.valores.baseGravada : 0;
      const bNoObj = v.valores ? v.valores.baseNoObjeto : 0;
      const vTotal = (b0 + bg + bNoObj);
      totalVentas += vTotal;

      const estab = String(v.estab || '001').padStart(3, '0');
      estabSalesMap[estab] = (estabSalesMap[estab] || 0) + vTotal;
    }

    if (Object.keys(estabSalesMap).length === 0) {
      estabSalesMap['001'] = 0.0;
    }

    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    xml += '<iva>\n';
    xml += `  <NumeroRuc>${rucInformante}</NumeroRuc>\n`;
    xml += `  <RazonSocial>${razonSocialInformante}</RazonSocial>\n`;
    xml += `  <Anio>${yearStr}</Anio>\n`;
    xml += `  <Mes>${month2Digits}</Mes>\n`;
    xml += `  <numEstabRuc>${String(Object.keys(estabSalesMap).length).padStart(3, '0')}</numEstabRuc>\n`;
    xml += `  <totalVentas>${to2Dec(totalVentas)}</totalVentas>\n`;
    xml += `  <codigoOperativo>IVA</codigoOperativo>\n`;

    // 1. SECCIÓN COMPRAS
    if (compras.length > 0) {
      xml += '  <compras>\n';
      for (const c of compras) {
        const codSustento = c.codSustento || '01';
        const emisor = c.emisor || {};
        const valores = c.valores || {};

        const idProv = (emisor.ruc || '9999999999999').trim();
        const tpIdProv = emisor.tpIdProv || (idProv.length === 10 ? '02' : (idProv.length === 13 ? '01' : '03'));
        const tipoProv = emisor.tipoProv || (idProv.length === 13 && parseInt(idProv.charAt(2), 10) >= 6 ? '02' : '01');
        const tipoComprobante = c.tipoDoc || '01';
        const denominacionProv = escapeXml(emisor.razonSocial || 'PROVEEDOR');
        const fechaEmision = c.fechaEmision || '01/01/2025';
        const estab = c.estab || '001';
        const ptoEmi = c.ptoEmi || '001';
        const secuencial = c.secuencial || '000000001';
        const autorizacion = c.claveAcceso || c.numeroAutorizacion || '0000000000000000000000000000000000000000000000000';
        const formaPago = c.formaPago || '20';

        xml += '    <detalleCompras>\n';
        xml += `      <codSustento>${codSustento}</codSustento>\n`;
        xml += `      <tpIdProv>${tpIdProv}</tpIdProv>\n`;
        xml += `      <idProv>${idProv}</idProv>\n`;
        xml += `      <tipoComprobante>${tipoComprobante}</tipoComprobante>\n`;
        xml += `      <tipoProv>${tipoProv}</tipoProv>\n`;
        xml += `      <denominacionProv>${denominacionProv}</denominacionProv>\n`;
        xml += `      <parteRel>NO</parteRel>\n`;
        xml += `      <fechaRegistro>${fechaEmision}</fechaRegistro>\n`;
        xml += `      <establecimiento>${estab}</establecimiento>\n`;
        xml += `      <puntoEmision>${ptoEmi}</puntoEmision>\n`;
        xml += `      <secuencial>${secuencial}</secuencial>\n`;
        xml += `      <fechaEmision>${fechaEmision}</fechaEmision>\n`;
        xml += `      <autorizacion>${autorizacion}</autorizacion>\n`;
        xml += `      <baseNoGraIva>${to2Dec(valores.baseNoObjeto || 0)}</baseNoGraIva>\n`;
        xml += `      <baseImponible>${to2Dec(valores.base0 || 0)}</baseImponible>\n`;
        xml += `      <baseImpGrav>${to2Dec(valores.baseGravada || 0)}</baseImpGrav>\n`;
        xml += `      <baseImpExe>${to2Dec(valores.baseExenta || 0)}</baseImpExe>\n`;
        xml += `      <montoIce>${to2Dec(valores.montoIce || 0)}</montoIce>\n`;
        xml += `      <montoIva>${to2Dec(valores.montoIva || 0)}</montoIva>\n`;
        xml += `      <valRetBien10>${to2Dec(c.valRetBien10 || 0)}</valRetBien10>\n`;
        xml += `      <valRetServ20>${to2Dec(c.valRetServ20 || 0)}</valRetServ20>\n`;
        xml += `      <valorRetBienes>${to2Dec(c.valorRetBienes || 0)}</valorRetBienes>\n`;
        xml += `      <valRetServ50>${to2Dec(c.valRetServ50 || 0)}</valRetServ50>\n`;
        xml += `      <valorRetServicios>${to2Dec(c.valorRetServicios || 0)}</valorRetServicios>\n`;
        xml += `      <valRetServ100>${to2Dec(c.valRetServ100 || 0)}</valRetServ100>\n`;
        xml += `      <valorRetencionNc>${to2Dec(c.valorRetencionNc || 0)}</valorRetencionNc>\n`;
        xml += `      <totbasesImpReemb>0.00</totbasesImpReemb>\n`;
        xml += '      <pagoExterior>\n';
        xml += '        <pagoLocExt>01</pagoLocExt>\n';
        xml += '        <paisEfecPago>NA</paisEfecPago>\n';
        xml += '        <aplicConvDobTrib>NA</aplicConvDobTrib>\n';
        xml += '        <pagExtSujRetNorLeg>NA</pagExtSujRetNorLeg>\n';
        xml += '      </pagoExterior>\n';
        xml += '      <formasDePago>\n';
        xml += `        <formaPago>${formaPago}</formaPago>\n`;
        xml += '      </formasDePago>\n';

        // Módulo AIR (Retenciones en la Fuente de Impuesto a la Renta)
        const retAirList = c.retencionesAir || c.air || [];
        if (Array.isArray(retAirList) && retAirList.length > 0) {
          xml += '      <air>\n';
          for (const r of retAirList) {
            const codRetAir = r.codRetAir || '312';
            const baseImpAir = r.baseImpAir !== undefined ? r.baseImpAir : (valores.baseGravada || 0);
            const porcentajeAir = r.porcentajeAir || 0;
            const valRetAir = r.valRetAir || 0;
            xml += '        <detalleAir>\n';
            xml += `          <codRetAir>${codRetAir}</codRetAir>\n`;
            xml += `          <baseImpAir>${to2Dec(baseImpAir)}</baseImpAir>\n`;
            xml += `          <porcentajeAir>${to2Dec(porcentajeAir)}</porcentajeAir>\n`;
            xml += `          <valRetAir>${to2Dec(valRetAir)}</valRetAir>\n`;
            xml += '        </detalleAir>\n';
          }
          xml += '      </air>\n';
        }

        // Datos del Comprobante de Retención emitido (si aplica)
        if (c.retencionDoc) {
          const rDoc = c.retencionDoc;
          xml += `      <estabRetencion1>${rDoc.estab || estab}</estabRetencion1>\n`;
          xml += `      <ptoEmiRetencion1>${rDoc.ptoEmi || ptoEmi}</ptoEmiRetencion1>\n`;
          xml += `      <secRetencion1>${rDoc.secuencial || '000000001'}</secRetencion1>\n`;
          xml += `      <autRetencion1>${rDoc.claveAcceso || autorizacion}</autRetencion1>\n`;
          xml += `      <fechaEmiRet1>${rDoc.fechaEmision || fechaEmision}</fechaEmiRet1>\n`;
        }

        // Datos de Documento Modificado si es Nota de Crédito (04)
        if (tipoComprobante === '04' && (c.docModificado || c.numDocModificado)) {
          xml += `      <docModificado>${c.docModificado || '01'}</docModificado>\n`;
          xml += `      <estabModificado>${c.estabModificado || '001'}</estabModificado>\n`;
          xml += `      <ptoEmiModificado>${c.ptoEmiModificado || '001'}</ptoEmiModificado>\n`;
          xml += `      <secModificado>${c.secModificado || '000000001'}</secModificado>\n`;
          xml += `      <autModificado>${c.autModificado || autorizacion}</autModificado>\n`;
        }

        xml += '    </detalleCompras>\n';
      }
      xml += '  </compras>\n';
    }

    // 2. SECCIÓN VENTAS
    if (ventas.length > 0) {
      xml += '  <ventas>\n';
      for (const v of ventas) {
        const comprador = v.comprador || {};
        const valores = v.valores || {};
        const idCliente = (comprador.identificacion || '9999999999999').trim();
        const tpIdCliente = comprador.tipoId || (idCliente.length === 10 ? '05' : (idCliente === '9999999999999' ? '07' : '04'));
        const formaPago = v.formaPago || '20';
        const tipoCompVenta = v.tipoDoc === '04' ? '04' : '18';

        xml += '    <detalleVentas>\n';
        xml += `      <tpIdCliente>${tpIdCliente}</tpIdCliente>\n`;
        xml += `      <idCliente>${idCliente}</idCliente>\n`;
        xml += `      <parteRelVtas>NO</parteRelVtas>\n`;
        xml += `      <tipoComprobante>${tipoCompVenta}</tipoComprobante>\n`;
        xml += `      <tipoEmision>E</tipoEmision>\n`;
        xml += `      <numeroComprobantes>1</numeroComprobantes>\n`;
        xml += `      <baseNoGraIva>${to2Dec(valores.baseNoObjeto || 0)}</baseNoGraIva>\n`;
        xml += `      <baseImponible>${to2Dec(valores.base0 || 0)}</baseImponible>\n`;
        xml += `      <baseImpGrav>${to2Dec(valores.baseGravada || 0)}</baseImpGrav>\n`;
        xml += `      <montoIva>${to2Dec(valores.montoIva || 0)}</montoIva>\n`;
        xml += `      <montoIce>${to2Dec(valores.montoIce || 0)}</montoIce>\n`;
        xml += `      <valorRetIva>${to2Dec(v.valorRetIva || 0)}</valorRetIva>\n`;
        xml += `      <valorRetRenta>${to2Dec(v.valorRetRenta || 0)}</valorRetRenta>\n`;
        xml += '      <formasDePago>\n';
        xml += `        <formaPago>${formaPago}</formaPago>\n`;
        xml += '      </formasDePago>\n';
        xml += '    </detalleVentas>\n';
      }
      xml += '  </ventas>\n';
    }

    // 3. VENTAS ESTABLECIMIENTO (Soporte Multi-Establecimiento)
    xml += '  <ventasEstablecimiento>\n';
    for (const [codEstab, vEst] of Object.entries(estabSalesMap)) {
      xml += '    <ventaEst>\n';
      xml += `      <codEstab>${codEstab}</codEstab>\n`;
      xml += `      <ventasEst>${to2Dec(vEst)}</ventasEst>\n`;
      xml += '      <ivaComp>0.00</ivaComp>\n';
      xml += '    </ventaEst>\n';
    }
    xml += '  </ventasEstablecimiento>\n';

    // 4. COMPROBANTES ANULADOS (Si existen)
    if (anuladosList.length > 0) {
      xml += '  <anulados>\n';
      for (const a of anuladosList) {
        xml += '    <detalleAnulados>\n';
        xml += `      <tipoComprobante>${a.tipoComprobante || '01'}</tipoComprobante>\n`;
        xml += `      <establecimiento>${a.establecimiento || '001'}</establecimiento>\n`;
        xml += `      <puntoEmision>${a.puntoEmision || '001'}</puntoEmision>\n`;
        xml += `      <secuencialInicio>${a.secuencialInicio || 1}</secuencialInicio>\n`;
        xml += `      <secuencialFin>${a.secuencialFin || a.secuencialInicio || 1}</secuencialFin>\n`;
        xml += `      <autorizacion>${a.autorizacion || '0000000000000000000000000000000000000000000000000'}</autorizacion>\n`;
        xml += '    </detalleAnulados>\n';
      }
      xml += '  </anulados>\n';
    }

    xml += '</iva>\n';

    xml += '</iva>\n';

    // Guardar en la subcarpeta 'ATS' del cliente
    const atsDir = path.join(client.defaultFolder, 'ATS');
    if (!fs.existsSync(atsDir)) {
      fs.mkdirSync(atsDir, { recursive: true });
    }

    // 1. Guardar archivo XML con nomenclatura oficial SRI (ATmmaaaa.xml) y legacy (ATS_MM_AAAA.xml)
    const officialXmlName = `AT${month2Digits}${yearStr}.xml`;
    const legacyXmlName = `ATS_${month2Digits}_${yearStr}.xml`;
    const officialXmlPath = path.join(atsDir, officialXmlName);
    const legacyXmlPath = path.join(atsDir, legacyXmlName);

    fs.writeFileSync(officialXmlPath, xml, 'utf8');
    fs.writeFileSync(legacyXmlPath, xml, 'utf8');

    // 2. Generar el archivo ZIP oficial exigido por el portal SRI RIG (ATmmaaaa.zip)
    const officialZipName = `AT${month2Digits}${yearStr}.zip`;
    const officialZipPath = path.join(atsDir, officialZipName);
    const xmlBuffer = Buffer.from(xml, 'utf8');
    const zipBuffer = createZipBuffer(officialXmlName, xmlBuffer);

    fs.writeFileSync(officialZipPath, zipBuffer);

    const maxSizeBytes = (SRI_LIMITES && SRI_LIMITES.MAX_ZIP_SIZE_BYTES) || 8 * 1024 * 1024;
    const withinSizeLimit = zipBuffer.length <= maxSizeBytes;

    return {
      success: true,
      fileName: legacyXmlName, // Preservar para tests unitarios
      filePath: legacyXmlPath,
      xmlFileName: officialXmlName,
      xmlFilePath: officialXmlPath,
      zipFileName: officialZipName,
      zipFilePath: officialZipPath,
      zipSizeBytes: zipBuffer.length,
      withinSizeLimit,
      folderPath: atsDir,
      totalCompras: compras.length,
      totalVentas: ventas.length,
      totalMontoVentas: totalVentas,
      validation
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  generateAtsXml,
  extractMonthNumber,
  escapeXml,
  createZipBuffer,
  calculateCrc32
};
