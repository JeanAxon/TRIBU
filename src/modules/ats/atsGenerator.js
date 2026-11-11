const fs = require('fs');
const path = require('path');
const { to2Dec, toFloat } = require('./xmlParser');

/**
 * Escapa caracteres especiales de XML
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
 * Genera el XML oficial del Anexo Transaccional Simplificado (ATS) SRI Ecuador
 */
function generateAtsXml({ client, year, month, compras = [], ventas = [] }) {
  try {
    const month2Digits = extractMonthNumber(month);
    const yearStr = String(year);
    const rucInformante = client.ruc;
    const razonSocialInformante = escapeXml(client.razonSocial || client.name || 'CONTRIBUYENTE');

    let totalVentas = 0.0;
    for (const v of ventas) {
      const b0 = v.valores ? v.valores.base0 : 0;
      const bg = v.valores ? v.valores.baseGravada : 0;
      totalVentas += (b0 + bg);
    }

    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    xml += '<iva>\n';
    xml += `  <NumeroRuc>${rucInformante}</NumeroRuc>\n`;
    xml += `  <RazonSocial>${razonSocialInformante}</RazonSocial>\n`;
    xml += `  <Anio>${yearStr}</Anio>\n`;
    xml += `  <Mes>${month2Digits}</Mes>\n`;
    xml += `  <numEstabRuc>001</numEstabRuc>\n`;
    xml += `  <totalVentas>${to2Dec(totalVentas)}</totalVentas>\n`;
    xml += `  <codigoOperativo>IVA</codigoOperativo>\n`;

    // 1. SECCIÓN COMPRAS
    if (compras.length > 0) {
      xml += '  <compras>\n';
      for (const c of compras) {
        const codSustento = c.codSustento || '01';
        const emisor = c.emisor || {};
        const valores = c.valores || {};

        const tpIdProv = emisor.tpIdProv || (emisor.ruc && emisor.ruc.length === 10 ? '02' : '01');
        const tipoProv = emisor.tipoProv || '01';
        const idProv = emisor.ruc || '9999999999999';
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
        xml += `      <valRetBien10>0.00</valRetBien10>\n`;
        xml += `      <valRetServ20>0.00</valRetServ20>\n`;
        xml += `      <valorRetBienes>0.00</valorRetBienes>\n`;
        xml += `      <valRetServ50>0.00</valRetServ50>\n`;
        xml += `      <valorRetServicios>0.00</valorRetServicios>\n`;
        xml += `      <valRetServ100>0.00</valRetServ100>\n`;
        xml += `      <valorRetencionNc>0.00</valorRetencionNc>\n`;
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
        const idCliente = comprador.identificacion || '9999999999999';
        const tpIdCliente = comprador.tipoId || (idCliente.length === 10 ? '05' : (idCliente === '9999999999999' ? '07' : '04'));
        const formaPago = v.formaPago || '20';

        xml += '    <detalleVentas>\n';
        xml += `      <tpIdCliente>${tpIdCliente}</tpIdCliente>\n`;
        xml += `      <idCliente>${idCliente}</idCliente>\n`;
        xml += `      <parteRelVtas>NO</parteRelVtas>\n`;
        xml += `      <tipoComprobante>18</tipoComprobante>\n`; // Facturación electrónica
        xml += `      <tipoEmision>E</tipoEmision>\n`;
        xml += `      <numeroComprobantes>1</numeroComprobantes>\n`;
        xml += `      <baseNoGraIva>${to2Dec(valores.baseNoObjeto || 0)}</baseNoGraIva>\n`;
        xml += `      <baseImponible>${to2Dec(valores.base0 || 0)}</baseImponible>\n`;
        xml += `      <baseImpGrav>${to2Dec(valores.baseGravada || 0)}</baseImpGrav>\n`;
        xml += `      <montoIva>${to2Dec(valores.montoIva || 0)}</montoIva>\n`;
        xml += `      <montoIce>${to2Dec(valores.montoIce || 0)}</montoIce>\n`;
        xml += `      <valorRetIva>0.00</valorRetIva>\n`;
        xml += `      <valorRetRenta>0.00</valorRetRenta>\n`;
        xml += '      <formasDePago>\n';
        xml += `        <formaPago>${formaPago}</formaPago>\n`;
        xml += '      </formasDePago>\n';
        xml += '    </detalleVentas>\n';
      }
      xml += '  </ventas>\n';
    }

    // 3. VENTAS ESTABLECIMIENTO
    xml += '  <ventasEstablecimiento>\n';
    xml += '    <ventaEst>\n';
    xml += '      <codEstab>001</codEstab>\n';
    xml += `      <ventasEst>${to2Dec(totalVentas)}</ventasEst>\n`;
    xml += '      <ivaComp>0.00</ivaComp>\n';
    xml += '    </ventaEst>\n';
    xml += '  </ventasEstablecimiento>\n';

    xml += '</iva>\n';

    // Guardar en la subcarpeta 'ATS' del cliente
    const atsDir = path.join(client.defaultFolder, 'ATS');
    if (!fs.existsSync(atsDir)) {
      fs.mkdirSync(atsDir, { recursive: true });
    }

    const fileName = `ATS_${month2Digits}_${yearStr}.xml`;
    const fullPath = path.join(atsDir, fileName);
    fs.writeFileSync(fullPath, xml, 'utf8');

    return {
      success: true,
      fileName,
      filePath: fullPath,
      folderPath: atsDir,
      totalCompras: compras.length,
      totalVentas: ventas.length,
      totalMontoVentas: totalVentas
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
  escapeXml
};
