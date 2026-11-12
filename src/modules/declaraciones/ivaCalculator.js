/**
 * Motor de Cálculo Tributario - Formulario 104 (IVA) SRI Ecuador
 * TRIBU - Asistente Contable
 * 
 * Basado estrictamente en:
 * 1. Ley de Régimen Tributario Interno (LRTI) y RALRTI.
 * 2. Guía Oficial para el llenado del Formulario de IVA (27 páginas, SRI).
 * 3. Inspección en vivo del portal srienlinea.sri.gob.ec (JSF PrimeFaces).
 * 
 * Regla de estilo: Cero emojis en código, comentarios y salidas.
 */

function round2(val) {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0.0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function round4(val) {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0.0;
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
}

/**
 * Procesa y totaliza un conjunto de comprobantes de ventas (facturas y notas de crédito/débito)
 */
function processVentas(ventasDocs = []) {
  let c111 = 0; // Total comprobantes emitidos

  let c401 = 0.0; // Ventas brutas tarifa diferente de 0%
  let nc401 = 0.0; // Notas de crédito restadas a ventas tarifa diferente de 0%
  let c410 = 0.0; // Ventas materiales de construcción 5% neto
  let c425 = 0.0; // Ventas servicios turísticos 8% neto
  let c403 = 0.0; // Ventas 0% sin derecho a crédito tributario
  let c404 = 0.0; // Ventas 0% con derecho a crédito tributario
  let c405 = 0.0; // Exportaciones de bienes
  let c406 = 0.0; // Exportaciones de servicios
  let c407 = 0.0; // Ventas no objeto de IVA
  let c408 = 0.0; // Ventas ZEDE
  let c423 = 0.0; // Notas de crédito 0%
  let c424 = 0.0; // Notas de crédito gravadas
  let c453 = 0.0; // Notas de débito 0%
  let c454 = 0.0; // Notas de débito gravadas

  let totalIvaGeneradoCalculado = 0.0;

  for (const doc of ventasDocs) {
    if (!doc || !doc.valores) continue;
    const tipo = String(doc.tipoDoc || '01');
    const val = doc.valores;

    if (tipo === '01') { // Factura
      c111++;
      const baseGrav = round2(val.baseGravada || 0.0);
      const tarifa = val.tarifaIvaPorcentaje || 15;

      if (tarifa === 5) {
        c410 += baseGrav;
      } else if (tarifa === 8) {
        c425 += baseGrav;
      } else if (baseGrav > 0) {
        c401 += baseGrav;
      }

      c403 += round2(val.base0 || 0.0);
      c407 += round2(val.baseNoObjeto || 0.0);
      totalIvaGeneradoCalculado += round2(val.montoIva || 0.0);

    } else if (tipo === '04') { // Nota de Crédito emitida
      const baseGrav = round2(val.baseGravada || 0.0);
      const base0 = round2(val.base0 || 0.0);
      c424 += baseGrav;
      c423 += base0;
      nc401 += baseGrav;
      totalIvaGeneradoCalculado -= round2(val.montoIva || 0.0);

    } else if (tipo === '05') { // Nota de Débito emitida
      const baseGrav = round2(val.baseGravada || 0.0);
      const base0 = round2(val.base0 || 0.0);
      c454 += baseGrav;
      c453 += base0;
      c401 += baseGrav;
      totalIvaGeneradoCalculado += round2(val.montoIva || 0.0);
    }
  }

  // Base neta en ventas locales tarifa diferente de cero
  const c411 = round2(Math.max(c401 - nc401, 0.0));
  const c421 = round2(c411 * 0.15); // Tarifa vigente normal 15%
  const c420 = round2(c410 * 0.05); // 5% materiales
  const c435 = round2(c425 * 0.08); // 8% turismo

  const c413 = round2(c403 - c423);
  const c414 = round2(c404);
  const c415 = round2(c405);
  const c416 = round2(c406);
  const c417 = round2(c407);
  const c418 = round2(c408);

  const c409 = round2(c401 + c410 + c425 + c403 + c404 + c405 + c406 + c407 + c408);
  const c419 = round2(c411 + c410 + c425 + c413 + c414 + c415 + c416 + c417 + c418);
  const c429 = round2(c421 + c420 + c435);
  const c499 = round2(c429); // Total impuesto generado

  return {
    c111,
    c401: round2(c401),
    c411,
    c421,
    c410: round2(c410),
    c420,
    c425: round2(c425),
    c435,
    c403: round2(c403),
    c413: Math.max(c413, 0.0),
    c404: round2(c404),
    c414,
    c405: round2(c405),
    c415,
    c406: round2(c406),
    c416,
    c407: round2(c407),
    c417,
    c408: round2(c408),
    c418,
    c423: round2(c423),
    c424: round2(c424),
    c453: round2(c453),
    c454: round2(c454),
    c409,
    c419,
    c429,
    c499,
    ivaFacturadoTotal: round2(Math.max(totalIvaGeneradoCalculado, 0.0))
  };
}

/**
 * Procesa y totaliza un conjunto de comprobantes de compras (facturas recibidas, notas de crédito recibidas)
 */
function processCompras(comprasDocs = []) {
  let c500 = 0.0; // Adquisiciones locales tarifa diferente de cero con derecho a CT (Bruto)
  let nc500 = 0.0; // Notas de crédito recibidas gravadas
  let c501 = 0.0; // Compras sin derecho a crédito tributario
  let c502 = 0.0; // Compras activos fijos gravadas
  let c503 = 0.0; // Importaciones servicios
  let c504 = 0.0; // Importaciones bienes
  let c505 = 0.0; // Compras locales tarifa 0%
  let c506 = 0.0; // Compras a contribuyentes RIMPE
  let c507 = 0.0; // Compras no objeto de IVA
  let c540 = 0.0; // Compras materiales construcción 5%
  let c535 = 0.0; // Compras servicios turísticos 8%
  let c527 = 0.0; // Notas de crédito tarifa 0%
  let c543 = 0.0; // Notas de crédito tarifa diferente de 0%

  let totalIvaPagadoCompras = 0.0;

  for (const doc of comprasDocs) {
    if (!doc || !doc.valores) continue;
    const tipo = String(doc.tipoDoc || '01');
    const val = doc.valores;

    if (tipo === '01' || tipo === '03') { // Factura o Liquidación de Compra
      const baseGrav = round2(val.baseGravada || 0.0);
      const tarifa = val.tarifaIvaPorcentaje || 15;

      if (tarifa === 5) {
        c540 += baseGrav;
      } else if (tarifa === 8) {
        c535 += baseGrav;
      } else if (baseGrav > 0) {
        c500 += baseGrav;
      }

      // Comprobar si el emisor es RIMPE o si es tarifa 0%
      const esRimpe = doc.emisor && (
        String(doc.emisor.contribuyenteEspecial || '').toLowerCase().includes('rimpe') ||
        String(doc.emisor.razonSocial || '').toLowerCase().includes('negocio popular')
      );

      if (esRimpe) {
        c506 += round2((val.base0 || 0.0) + (val.total || 0.0));
      } else {
        c505 += round2(val.base0 || 0.0);
      }

      c507 += round2(val.baseNoObjeto || 0.0);
      totalIvaPagadoCompras += round2(val.montoIva || 0.0);

    } else if (tipo === '04') { // Nota de Crédito recibida
      const baseGrav = round2(val.baseGravada || 0.0);
      const base0 = round2(val.base0 || 0.0);
      c543 += baseGrav;
      c527 += base0;
      nc500 += baseGrav;
      totalIvaPagadoCompras -= round2(val.montoIva || 0.0);
    }
  }

  const c510 = round2(Math.max(c500 - nc500, 0.0));
  const c520 = round2(c510 * 0.15); // IVA compras locales con derecho total a CT
  const c530 = 0.0; // IVA compras sujeto a factor (se desglosa si aplica)
  const c515 = round2(c505 - c527);
  const c516 = round2(c506);
  const c550 = round2(c540 * 0.05); // 5% materiales
  const c545 = round2(c535 * 0.08); // 8% turismo

  const c509 = round2(c500 + c501 + c502 + c503 + c504 + c505 + c506 + c507 + c540 + c535);
  const c519 = round2(c510 + c515 + c516 + c507 + c540 + c535);

  return {
    c500: round2(c500),
    c510,
    c520,
    c530,
    c501: round2(c501),
    c511: round2(c501),
    c502: round2(c502),
    c512: round2(c502),
    c503: round2(c503),
    c513: round2(c503),
    c504: round2(c504),
    c514: round2(c504),
    c505: round2(c505),
    c515: Math.max(c515, 0.0),
    c506: round2(c506),
    c516,
    c507: round2(c507),
    c517: round2(c507),
    c540: round2(c540),
    c550,
    c535: round2(c535),
    c545,
    c527: round2(c527),
    c543: round2(c543),
    c509,
    c519,
    ivaPagadoTotal: round2(Math.max(totalIvaPagadoCompras, 0.0))
  };
}

/**
 * Procesa comprobantes de retención recibidos y emitidos
 */
function processRetenciones(retencionesRecibidasDocs = [], retencionesEmitidasDocs = []) {
  let c609 = 0.0; // Retenciones en la fuente de IVA que le han sido efectuadas
  let retencionesEmitidasTotal = 0.0;
  const desgloseRetEmitidas = {
    c721: 0.0, // 10%
    c723: 0.0, // 20%
    c725: 0.0, // 30%
    c727: 0.0, // 50%
    c729: 0.0, // 70%
    c731: 0.0  // 100%
  };

  // 1. Retenciones Recibidas (Clientes le retuvieron al contribuyente)
  for (const doc of retencionesRecibidasDocs) {
    if (!doc) continue;
    // Extraer impuestos retenidos de IVA (codigo '2')
    if (doc.detalles && Array.isArray(doc.detalles)) {
      for (const item of doc.detalles) {
        const codigo = String(item.codigo || item.codigoImpuesto || '');
        if (codigo === '2' || codigo.toLowerCase() === 'iva') {
          c609 += round2(item.valorRetenido || item.valor || 0.0);
        }
      }
    } else if (doc.valores && doc.valores.montoIva) {
      c609 += round2(doc.valores.montoIva || 0.0);
    }
  }

  // 2. Retenciones Emitidas (Si el contribuyente retuvo a proveedores)
  for (const doc of retencionesEmitidasDocs) {
    if (!doc) continue;
    if (doc.detalles && Array.isArray(doc.detalles)) {
      for (const item of doc.detalles) {
        const codigo = String(item.codigo || item.codigoImpuesto || '');
        if (codigo === '2' || codigo.toLowerCase() === 'iva') {
          const val = round2(item.valorRetenido || item.valor || 0.0);
          const porc = parseFloat(item.porcentajeRetener || item.tarifa || 0);
          retencionesEmitidasTotal += val;

          if (porc === 10) desgloseRetEmitidas.c721 += val;
          else if (porc === 20) desgloseRetEmitidas.c723 += val;
          else if (porc === 30) desgloseRetEmitidas.c725 += val;
          else if (porc === 50) desgloseRetEmitidas.c727 += val;
          else if (porc === 70) desgloseRetEmitidas.c729 += val;
          else if (porc === 100) desgloseRetEmitidas.c731 += val;
          else desgloseRetEmitidas.c725 += val; // Default bienes/servicios
        }
      }
    }
  }

  return {
    c609: round2(c609),
    c801: round2(retencionesEmitidasTotal),
    desgloseRetEmitidas: {
      c721: round2(desgloseRetEmitidas.c721),
      c723: round2(desgloseRetEmitidas.c723),
      c725: round2(desgloseRetEmitidas.c725),
      c727: round2(desgloseRetEmitidas.c727),
      c729: round2(desgloseRetEmitidas.c729),
      c731: round2(desgloseRetEmitidas.c731)
    }
  };
}

/**
 * Función principal de cálculo de liquidación tributaria integral Formulario 104
 */
function calculateDeclaracionIva({
  client = {},
  year = '',
  month = '',
  comprasDocs = [],
  ventasDocs = [],
  retencionesRecibidasDocs = [],
  retencionesEmitidasDocs = [],
  saldosAnteriores = {},
  ajustesManuales = {},
  confirmaciones = {}
}) {
  const ventas = processVentas(confirmaciones.ventasEnCero ? [] : ventasDocs);
  const compras = processCompras(confirmaciones.comprasEnCero ? [] : comprasDocs);
  const retenciones = processRetenciones(
    confirmaciones.retencionesRecibidasEnCero ? [] : retencionesRecibidasDocs,
    confirmaciones.retencionesEmitidasEnCero ? [] : retencionesEmitidasDocs
  );

  // 1. Factor de Proporcionalidad (Casillero 553)
  // Formula oficial SRI: (411 + 412 + 420 + 415 + 416 + 417 + 418) / 419
  let c553 = 100.0;
  if (ventas.c419 > 0) {
    const numerador = ventas.c411 + ventas.c420 + ventas.c415 + ventas.c416 + ventas.c417 + ventas.c418;
    c553 = round4((numerador / ventas.c419) * 100.0);
    c553 = Math.min(Math.max(c553, 0.0), 100.0);
  } else {
    // Si no hubo ventas en el mes, el factor de proporcionalidad legal para empresas gravadas es 100%
    c553 = 100.0;
  }

  // 2. Crédito tributario aplicable por adquisiciones (Casillero 563 / 564)
  // Suma de compras directas al 100% + compras sujetas a factor de proporcionalidad
  const creditoDirectoTotal = round2(compras.c520 + compras.c550 + compras.c545);
  const creditoSujetoProporcion = round2((compras.c530) * (c553 / 100.0));
  const c563 = round2(creditoDirectoTotal + creditoSujetoProporcion);
  const c564 = c563; // Total crédito tributario aplicable este mes

  // IVA cargado al gasto o costo deducible de Impuesto a la Renta (Casillero 565)
  const ivaNoAcreditado = round2(compras.ivaPagadoTotal - c564);
  const c565 = Math.max(ivaNoAcreditado, 0.0);

  // 3. Resumen Impositivo
  const c499 = ventas.c499;
  const c601 = round2(Math.max(c499 - c564, 0.0)); // Impuesto causado
  const c602 = round2(Math.min(c564, c499)); // Crédito tributario aplicable en el período

  // Saldos de arrastre mes anterior
  const c605 = round2(ajustesManuales.c605 || saldosAnteriores.c615 || 0.0); // Adquisiciones anterior
  const c606 = round2(ajustesManuales.c606 || saldosAnteriores.c617 || 0.0); // Retenciones anterior
  const c609 = retenciones.c609; // Retenciones recibidas período

  // Devolución o ajustes autorizados por resolución SRI
  const c607 = round2(ajustesManuales.c607 || 0.0);
  const c608 = round2(ajustesManuales.c608 || 0.0);

  // Subtotal a pagar
  // Se amortiza primero con crédito de adquisiciones (605) y luego con retenciones (606 y 609)
  const remanenteTrasCausado = round2(c601 - c605);
  let subtotalSinRetenciones = Math.max(remanenteTrasCausado, 0.0);
  let totalRetencionesDisponibles = round2(c606 + c609);

  let c620 = 0.0;
  let c615 = 0.0; // Saldo crédito adquisiciones para el mes siguiente
  let c617 = 0.0; // Saldo crédito retenciones para el mes siguiente

  if (c564 > c499) {
    // El crédito tributario del mes superó las ventas del mes
    c615 = round2((c564 - c499) + c605);
  } else if (c605 > c601) {
    // El saldo anterior de adquisiciones absorbió todo el impuesto causado
    c615 = round2(c605 - c601);
  } else {
    c615 = 0.0;
  }

  if (subtotalSinRetenciones > 0) {
    if (subtotalSinRetenciones >= totalRetencionesDisponibles) {
      c620 = round2(subtotalSinRetenciones - totalRetencionesDisponibles);
      c617 = 0.0;
    } else {
      c620 = 0.0;
      c617 = round2(totalRetencionesDisponibles - subtotalSinRetenciones);
    }
  } else {
    c620 = 0.0;
    c617 = totalRetencionesDisponibles;
  }

  const c699 = c620; // Impuesto a pagar por percepción

  // 4. Agente de Retención y Totales
  const c801 = retenciones.c801;
  const c802 = round2(ajustesManuales.c802 || 0.0); // Sector público exento
  const c859 = round2(c699 + c801 - c802);

  // Liquidación sustitutiva (si aplica)
  const c890 = round2(ajustesManuales.c890 || 0.0);
  const c898 = round2(ajustesManuales.c898 || 0.0);
  const c897 = round2(ajustesManuales.c897 || 0.0); // Interés
  const c899 = round2(ajustesManuales.c899 || 0.0); // Multa

  const c902 = round2(Math.max(c859 - c898 + c897 + c899, 0.0));

  // 5. Cuestionario de Perfilamiento Automático (Q1 a Q12)
  const totalValoresInvolucrados = ventas.c409 + compras.c509 + c605 + c606 + c609;
  const q1 = totalValoresInvolucrados > 0 ? 'Si' : 'No';
  const q2 = c565 > 0 ? 'Si' : 'No';
  const q3 = (ventas.c405 + ventas.c406 + compras.c503 + compras.c504) > 0 ? 'Si' : 'No';
  const q4 = (ventas.c423 + ventas.c424 + compras.c527 + compras.c543) > 0 ? 'Si' : 'No';
  const q5 = (ventas.c425 + compras.c535) > 0 ? 'Si' : 'No';
  const q6 = ventas.c409 > 0 ? 'Si' : 'No';
  const q7 = (ventas.c403 + ventas.c404 + ventas.c407 + ventas.c408) > 0 ? 'Si' : 'No';
  const q8 = (ventas.c401 + ventas.c410 + ventas.c425) > 0 ? 'Si' : 'No';
  const q9 = 'No'; // Financiamiento directo
  const q10 = compras.c509 > 0 ? 'Si' : 'No';
  const q11 = c801 > 0 ? 'Si' : 'No';
  const q12 = (ventas.c410 + compras.c540) > 0 ? 'Si' : 'No';

  return {
    periodo: {
      year,
      month
    },
    resumenEjecutivo: {
      totalVentasNetas: ventas.c419,
      totalComprasNetas: compras.c519,
      ivaGeneradoVentas: ventas.c499,
      ivaAcreditableCompras: c564,
      retencionesRecibidasPeriodo: c609,
      creditoMesAnteriorTotal: round2(c605 + c606),
      resultadoTipo: c902 > 0 ? 'A_PAGAR' : (c615 + c617 > 0 ? 'SALDO_A_FAVOR' : 'CERO'),
      valorPagar: c902,
      saldoFavorProximoMes: round2(c615 + c617)
    },
    casilleros: {
      // Identificación
      c203: client.contadorRuc || '',
      // Ventas
      c111: ventas.c111,
      c401: ventas.c401,
      c411: ventas.c411,
      c421: ventas.c421,
      c410: ventas.c410,
      c420: ventas.c420,
      c425: ventas.c425,
      c435: ventas.c435,
      c403: ventas.c403,
      c413: ventas.c413,
      c404: ventas.c404,
      c414: ventas.c414,
      c405: ventas.c405,
      c415: ventas.c415,
      c406: ventas.c406,
      c416: ventas.c416,
      c407: ventas.c407,
      c417: ventas.c417,
      c408: ventas.c408,
      c418: ventas.c418,
      c423: ventas.c423,
      c424: ventas.c424,
      c453: ventas.c453,
      c454: ventas.c454,
      c409: ventas.c409,
      c419: ventas.c419,
      c429: ventas.c429,
      c499: ventas.c499,
      // Compras
      c500: compras.c500,
      c510: compras.c510,
      c520: compras.c520,
      c530: compras.c530,
      c501: compras.c501,
      c511: compras.c511,
      c502: compras.c502,
      c512: compras.c512,
      c503: compras.c503,
      c513: compras.c513,
      c504: compras.c504,
      c514: compras.c514,
      c505: compras.c505,
      c515: compras.c515,
      c506: compras.c506,
      c516: compras.c516,
      c507: compras.c507,
      c517: compras.c517,
      c540: compras.c540,
      c550: compras.c550,
      c535: compras.c535,
      c545: compras.c545,
      c527: compras.c527,
      c543: compras.c543,
      c509: compras.c509,
      c519: compras.c519,
      c553,
      c563,
      c564,
      c565,
      // Resumen Impositivo
      c601,
      c602,
      c605,
      c606,
      c607,
      c608,
      c609,
      c615,
      c617,
      c620,
      c699,
      // Agente Retención
      c721: retenciones.desgloseRetEmitidas.c721,
      c723: retenciones.desgloseRetEmitidas.c723,
      c725: retenciones.desgloseRetEmitidas.c725,
      c727: retenciones.desgloseRetEmitidas.c727,
      c729: retenciones.desgloseRetEmitidas.c729,
      c731: retenciones.desgloseRetEmitidas.c731,
      c801,
      c802,
      // Totales
      c859,
      c890,
      c898,
      c897,
      c899,
      c902
    },
    perfilamiento: {
      pregunta0: q1,  // Requiere informar valores
      pregunta1: q2,  // IVA gasto deducible IR
      pregunta2: q3,  // Comercio exterior / activos fijos
      pregunta3: q4,  // Notas de crédito emitidas / recibidas
      pregunta4: q5,  // Actividades turísticas tarifa 8%
      pregunta5: q6,  // Ventas en el período
      pregunta6: q7,  // Ventas tarifa 0% / no objeto
      pregunta7: q8,  // Ventas tarifa diferente de 0%
      pregunta8: q9,  // Financiamiento directo
      pregunta9: q10, // Compras en el período
      pregunta10: q11,// Retenciones efectuadas
      pregunta11: q12 // Materiales de construcción 5%
    }
  };
}

module.exports = {
  calculateDeclaracionIva,
  processVentas,
  processCompras,
  processRetenciones,
  round2,
  round4
};
