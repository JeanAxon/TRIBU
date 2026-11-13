/**
 * Motor de Conciliación Tributaria - ATS vs Formularios SRI (Form 104 y Form 103)
 * TRIBU - Asistente Contable SRI Ecuador
 * 
 * Permite a los contadores:
 * 1. Mapear automáticamente los datos del ATS a los casilleros oficiales de:
 *    - Formulario 104 (Declaración de IVA mensual/semestral)
 *    - Formulario 103 (Declaración de Retenciones en la Fuente)
 * 2. Comparar cifras del anexo contra borradores o declaraciones presentadas
 * 3. Detectar discrepancias al centavo para prevenir notificaciones del SRI
 * 4. Generar reportes imprimibles y exportables de conciliación fiscal
 */

const { CONCEPTOS_RETENCION_AIR } = require('./constants');

function round2(val) {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0.0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Reconcilia y mapea compras, ventas y retenciones del ATS con los formularios 104 y 103
 */
function reconcileAtsWithDeclaraciones({
  compras = [],
  ventas = [],
  retencionesEmitidas = [],
  retencionesRecibidas = [],
  form104Overrides = {},
  form103Overrides = {}
}) {
  // =========================================================================
  // 1. ANÁLISIS DE VENTAS (FORMULARIO 104 - SECCIÓN 400)
  // =========================================================================
  let brutasGravadasVentas = 0.0;
  let ncGravadasVentas = 0.0;
  let brutas0Ventas = 0.0;
  let nc0Ventas = 0.0;
  let noObjetoVentas = 0.0;
  let exentaVentas = 0.0;
  let ivaVentasFacturas = 0.0;
  let ivaVentasNc = 0.0;

  for (const v of ventas) {
    const val = v.valores || {};
    const tipo = String(v.tipoDoc || '01');
    const bGrav = round2(val.baseGravada || 0.0);
    const b0 = round2(val.base0 || 0.0);
    const bNoObj = round2(val.baseNoObjeto || 0.0);
    const bExe = round2(val.baseExenta || 0.0);
    const iva = round2(val.montoIva || 0.0);

    if (tipo === '04') { // Nota de Crédito emitida en ventas
      ncGravadasVentas += bGrav;
      nc0Ventas += b0;
      ivaVentasNc += iva;
    } else { // Factura u otros comprobantes de venta
      brutasGravadasVentas += bGrav;
      brutas0Ventas += b0;
      noObjetoVentas += bNoObj;
      exentaVentas += bExe;
      ivaVentasFacturas += iva;
    }
  }

  const c411 = round2(Math.max(brutasGravadasVentas - ncGravadasVentas, 0.0));
  const c413 = round2(Math.max(brutas0Ventas - nc0Ventas, 0.0));
  const c417 = round2(noObjetoVentas);
  const c418 = round2(exentaVentas);
  const c419 = round2(c411 + c413 + c417 + c418);
  const c421 = round2(Math.max(ivaVentasFacturas - ivaVentasNc, 0.0));

  // =========================================================================
  // 2. ANÁLISIS DE COMPRAS (FORMULARIO 104 - SECCIÓN 500)
  // =========================================================================
  let brutasGravadasCompras = 0.0;
  let ncGravadasCompras = 0.0;
  let brutas0Compras = 0.0;
  let nc0Compras = 0.0;
  let noObjetoCompras = 0.0;
  let exentaCompras = 0.0;
  let ivaComprasFacturas = 0.0;
  let ivaComprasNc = 0.0;

  for (const c of compras) {
    const val = c.valores || {};
    const tipo = String(c.tipoDoc || '01');
    const bGrav = round2(val.baseGravada || 0.0);
    const b0 = round2(val.base0 || 0.0);
    const bNoObj = round2(val.baseNoObjeto || 0.0);
    const bExe = round2(val.baseExenta || 0.0);
    const iva = round2(val.montoIva || 0.0);

    if (tipo === '04') { // Nota de Crédito recibida en compras
      ncGravadasCompras += bGrav;
      nc0Compras += b0;
      ivaComprasNc += iva;
    } else { // Factura, liquidación de compra o comprobante físico
      brutasGravadasCompras += bGrav;
      brutas0Compras += b0;
      noObjetoCompras += bNoObj;
      exentaCompras += bExe;
      ivaComprasFacturas += iva;
    }
  }

  const c510 = round2(Math.max(brutasGravadasCompras - ncGravadasCompras, 0.0));
  const c517 = round2(Math.max(brutas0Compras - nc0Compras, 0.0));
  const c507 = round2(noObjetoCompras);
  const c508 = round2(exentaCompras);
  const c519 = round2(c510 + c517 + c507 + c508);
  const c520 = round2(Math.max(ivaComprasFacturas - ivaComprasNc, 0.0));

  // =========================================================================
  // 3. RETENCIONES RECIBIDAS EN VENTAS (CRÉDITO TRIBUTARIO IVA - CASILLERO 601)
  // =========================================================================
  let c601 = 0.0;
  let totalRetRentaRecibida = 0.0;

  // Sumar retenciones recibidas desde el array de retenciones recibidas
  for (const ret of retencionesRecibidas) {
    if (ret.totalesRetencion) {
      c601 += round2(ret.totalesRetencion.totalIva || 0.0);
      totalRetRentaRecibida += round2(ret.totalesRetencion.totalRenta || 0.0);
    } else if (ret.valores) {
      c601 += round2(ret.valores.montoIva || 0.0);
    }
  }

  // Sumar retenciones registradas directamente en cada venta
  for (const v of ventas) {
    if (v.valorRetIva) c601 += round2(v.valorRetIva);
    if (v.valorRetRenta) totalRetRentaRecibida += round2(v.valorRetRenta);
  }
  c601 = round2(c601);
  totalRetRentaRecibida = round2(totalRetRentaRecibida);

  // Liquidación del Impuesto
  const diferenciaIva = round2(c421 - c520 - c601);
  const c605 = diferenciaIva > 0 ? diferenciaIva : 0.0; // Impuesto a pagar
  const c615 = diferenciaIva < 0 ? round2(Math.abs(diferenciaIva)) : 0.0; // Crédito tributario próximo mes

  // Construcción del comparativo Formulario 104
  const f104Rows = [
    {
      casillero: '411',
      seccion: 'Ventas',
      descripcion: 'Ventas locales gravadas tarifa diferente de 0% (Neto)',
      atsCalculado: c411,
      declarado: form104Overrides['411'] !== undefined ? round2(form104Overrides['411']) : c411
    },
    {
      casillero: '413',
      seccion: 'Ventas',
      descripcion: 'Ventas locales tarifa 0% que no dan derecho a crédito tributario (Neto)',
      atsCalculado: c413,
      declarado: form104Overrides['413'] !== undefined ? round2(form104Overrides['413']) : c413
    },
    {
      casillero: '417',
      seccion: 'Ventas',
      descripcion: 'Ventas no objeto de IVA',
      atsCalculado: c417,
      declarado: form104Overrides['417'] !== undefined ? round2(form104Overrides['417']) : c417
    },
    {
      casillero: '419',
      seccion: 'Ventas',
      descripcion: 'Total ventas y otros ingresos netos',
      atsCalculado: c419,
      declarado: form104Overrides['419'] !== undefined ? round2(form104Overrides['419']) : c419
    },
    {
      casillero: '421',
      seccion: 'Ventas',
      descripcion: 'Total Impuesto Generado (IVA en ventas)',
      atsCalculado: c421,
      declarado: form104Overrides['421'] !== undefined ? round2(form104Overrides['421']) : c421
    },
    {
      casillero: '510',
      seccion: 'Compras',
      descripcion: 'Adquisiciones locales gravadas tarifa diferente de 0% con derecho a CT (Neto)',
      atsCalculado: c510,
      declarado: form104Overrides['510'] !== undefined ? round2(form104Overrides['510']) : c510
    },
    {
      casillero: '517',
      seccion: 'Compras',
      descripcion: 'Adquisiciones locales tarifa 0%',
      atsCalculado: c517,
      declarado: form104Overrides['517'] !== undefined ? round2(form104Overrides['517']) : c517
    },
    {
      casillero: '519',
      seccion: 'Compras',
      descripcion: 'Total adquisiciones netas',
      atsCalculado: c519,
      declarado: form104Overrides['519'] !== undefined ? round2(form104Overrides['519']) : c519
    },
    {
      casillero: '520',
      seccion: 'Compras',
      descripcion: 'Total Impuesto Causado (IVA en compras con derecho a CT)',
      atsCalculado: c520,
      declarado: form104Overrides['520'] !== undefined ? round2(form104Overrides['520']) : c520
    },
    {
      casillero: '601',
      seccion: 'Liquidación',
      descripcion: 'Retenciones en la fuente de IVA que le han sido efectuadas en el mes',
      atsCalculado: c601,
      declarado: form104Overrides['601'] !== undefined ? round2(form104Overrides['601']) : c601
    },
    {
      casillero: '605',
      seccion: 'Liquidación',
      descripcion: 'Impuesto a pagar por percepción (IVA a pagar)',
      atsCalculado: c605,
      declarado: form104Overrides['605'] !== undefined ? round2(form104Overrides['605']) : c605
    },
    {
      casillero: '615',
      seccion: 'Liquidación',
      descripcion: 'Saldo crédito tributario para el mes siguiente',
      atsCalculado: c615,
      declarado: form104Overrides['615'] !== undefined ? round2(form104Overrides['615']) : c615
    }
  ];

  let f104Discrepancias = 0;
  for (const row of f104Rows) {
    row.diferencia = round2(row.atsCalculado - row.declarado);
    row.isBalanced = Math.abs(row.diferencia) < 0.01;
    row.estado = row.isBalanced ? 'CUADRADO' : 'DISCREPANCIA';
    if (!row.isBalanced) f104Discrepancias++;
  }

  // =========================================================================
  // 4. ANÁLISIS DE RETENCIONES EN LA FUENTE (FORMULARIO 103 - AIR E IVA)
  // =========================================================================
  const airMap = {};

  // Acumular desde comprobantes de compra que tengan AIR
  for (const c of compras) {
    const airList = c.retencionesAir || c.air || [];
    for (const r of airList) {
      const cod = String(r.codRetAir || '312').trim();
      if (!airMap[cod]) {
        const catInfo = CONCEPTOS_RETENCION_AIR.find(item => item.code === cod);
        airMap[cod] = {
          codigo: cod,
          concepto: catInfo ? catInfo.label : `Concepto Retención ${cod}`,
          porcentaje: r.porcentajeAir || (catInfo ? catInfo.percent : 0),
          baseImponible: 0.0,
          valorRetenido: 0.0
        };
      }
      airMap[cod].baseImponible += round2(r.baseImpAir || 0.0);
      airMap[cod].valorRetenido += round2(r.valRetAir || 0.0);
    }
  }

  // Acumular desde comprobantes de retención emitidos
  for (const ret of retencionesEmitidas) {
    const rRenta = ret.retencionesRenta || [];
    for (const r of rRenta) {
      const cod = String(r.codRetAir || r.codigoRetencion || '312').trim();
      if (!airMap[cod]) {
        const catInfo = CONCEPTOS_RETENCION_AIR.find(item => item.code === cod);
        airMap[cod] = {
          codigo: cod,
          concepto: catInfo ? catInfo.label : `Concepto Retención ${cod}`,
          porcentaje: r.porcentajeAir || r.porcentajeRetener || (catInfo ? catInfo.percent : 0),
          baseImponible: 0.0,
          valorRetenido: 0.0
        };
      }
      airMap[cod].baseImponible += round2(r.baseImpAir || r.baseImponible || 0.0);
      airMap[cod].valorRetenido += round2(r.valRetAir || r.valorRetenido || 0.0);
    }
  }

  // Retenciones de IVA emitidas en compras
  let retIvaEmitida10 = 0.0;
  let retIvaEmitida20 = 0.0;
  let retIvaEmitida30 = 0.0;
  let retIvaEmitida50 = 0.0;
  let retIvaEmitida70 = 0.0;
  let retIvaEmitida100 = 0.0;

  for (const c of compras) {
    retIvaEmitida10 += round2(c.valRetBien10 || 0.0);
    retIvaEmitida20 += round2(c.valRetServ20 || 0.0);
    retIvaEmitida30 += round2(c.valorRetBienes || 0.0);
    retIvaEmitida50 += round2(c.valRetServ50 || 0.0);
    retIvaEmitida70 += round2(c.valorRetServicios || 0.0);
    retIvaEmitida100 += round2(c.valRetServ100 || 0.0);
  }

  for (const ret of retencionesEmitidas) {
    const rIva = ret.retencionesIva || [];
    for (const ri of rIva) {
      const porc = parseFloat(ri.porcentajeRetener || 0);
      const val = round2(ri.valorRetenido || 0);
      if (porc === 10) retIvaEmitida10 += val;
      else if (porc === 20) retIvaEmitida20 += val;
      else if (porc === 30) retIvaEmitida30 += val;
      else if (porc === 50) retIvaEmitida50 += val;
      else if (porc === 70) retIvaEmitida70 += val;
      else if (porc === 100) retIvaEmitida100 += val;
    }
  }

  const totalRetIvaEmitida = round2(
    retIvaEmitida10 + retIvaEmitida20 + retIvaEmitida30 +
    retIvaEmitida50 + retIvaEmitida70 + retIvaEmitida100
  );

  let totalRentaRetenidoAts = 0.0;
  const f103AirRows = Object.values(airMap).map(item => {
    item.baseImponible = round2(item.baseImponible);
    item.valorRetenido = round2(item.valorRetenido);
    totalRentaRetenidoAts += item.valorRetenido;

    const declarado = form103Overrides[item.codigo] !== undefined
      ? round2(form103Overrides[item.codigo])
      : item.valorRetenido;

    const diff = round2(item.valorRetenido - declarado);
    const isBalanced = Math.abs(diff) < 0.01;

    return {
      codigo: item.codigo,
      concepto: item.concepto,
      porcentaje: item.porcentaje,
      baseImponible: item.baseImponible,
      valorRetenidoAts: item.valorRetenido,
      declarado,
      diferencia: diff,
      isBalanced,
      estado: isBalanced ? 'CUADRADO' : 'DISCREPANCIA'
    };
  });

  totalRentaRetenidoAts = round2(totalRentaRetenidoAts);
  const totalF103Ats = round2(totalRentaRetenidoAts + totalRetIvaEmitida);

  let f103Discrepancias = f103AirRows.filter(r => !r.isBalanced).length;

  return {
    success: true,
    form104: {
      rows: f104Rows,
      discrepanciasCount: f104Discrepancias,
      isFullyBalanced: f104Discrepancias === 0,
      resumen: {
        totalVentasNetas: c419,
        ivaVentasGenerado: c421,
        totalComprasNetas: c519,
        ivaComprasCausado: c520,
        retencionesIvaRecibidas: c601,
        impuestoPagar: c605,
        saldoCreditoTributario: c615
      }
    },
    form103: {
      airRows: f103AirRows,
      discrepanciasCount: f103Discrepancias,
      isFullyBalanced: f103Discrepancias === 0,
      retencionesIvaEmitidas: {
        ret10: round2(retIvaEmitida10),
        ret20: round2(retIvaEmitida20),
        ret30: round2(retIvaEmitida30),
        ret50: round2(retIvaEmitida50),
        ret70: round2(retIvaEmitida70),
        ret100: round2(retIvaEmitida100),
        totalIvaRetenido: totalRetIvaEmitida
      },
      resumen: {
        totalRentaRetenido: totalRentaRetenidoAts,
        totalIvaRetenido: totalRetIvaEmitida,
        totalPagarF103: totalF103Ats
      }
    },
    globalStatus: {
      totalDiscrepancias: f104Discrepancias + f103Discrepancias,
      isFullyBalanced: (f104Discrepancias + f103Discrepancias) === 0
    }
  };
}

module.exports = {
  reconcileAtsWithDeclaraciones,
  round2
};
