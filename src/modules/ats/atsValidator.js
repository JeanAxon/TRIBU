/**
 * Motor de Validación Normativa y Técnica para ATS (SRI Ecuador)
 * Basado en la Ficha Técnica Oficial del Anexo Transaccional Simplificado
 * y Catálogo Oficial del Servicio de Rentas Internas.
 */

const {
  TIPO_IDENTIFICACION_PROVEEDOR,
  FORMAS_DE_PAGO,
  SRI_LIMITES
} = require('./constants');

/**
 * Valida un RUC o Cédula ecuatoriana según el algoritmo oficial de dígito verificador
 */
function validarIdentificacionEcuador(numero, tipo = 'RUC') {
  if (!numero || typeof numero !== 'string') return false;
  const id = numero.trim();

  if (tipo === 'CONSUMIDOR_FINAL' || id === '9999999999999') {
    return true;
  }

  // Cédula: 10 dígitos numéricos
  if (tipo === 'CEDULA' || (tipo === 'AUTO' && id.length === 10)) {
    if (!/^\d{10}$/.test(id)) return false;
    const provincia = parseInt(id.substring(0, 2), 10);
    if ((provincia < 1 || provincia > 24) && provincia !== 30) return false;
    const tercerDigito = parseInt(id.charAt(2), 10);
    if (tercerDigito >= 6) return false;

    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let valor = parseInt(id.charAt(i), 10) * coeficientes[i];
      if (valor >= 10) valor -= 9;
      suma += valor;
    }
    const digitoVerificador = (10 - (suma % 10)) % 10;
    return digitoVerificador === parseInt(id.charAt(9), 10);
  }

  // RUC: 13 dígitos numéricos terminados en 001 (o 0001 en instituciones públicas)
  if (tipo === 'RUC' || (tipo === 'AUTO' && id.length === 13)) {
    if (!/^\d{13}$/.test(id)) return false;
    const provincia = parseInt(id.substring(0, 2), 10);
    if ((provincia < 1 || provincia > 24) && provincia !== 30) return false;

    const tercerDigito = parseInt(id.charAt(2), 10);

    // Persona Natural (tercer dígito < 6)
    if (tercerDigito < 6) {
      if (!id.endsWith('001')) return false;
      const cedulaPart = id.substring(0, 10);
      return validarIdentificacionEcuador(cedulaPart, 'CEDULA');
    }

    // Sociedad Pública (tercer dígito = 6)
    if (tercerDigito === 6) {
      if (id.substring(9) !== '0001' && !id.endsWith('001')) return false;
      const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
      let suma = 0;
      for (let i = 0; i < 8; i++) {
        suma += parseInt(id.charAt(i), 10) * coeficientes[i];
      }
      const residuo = suma % 11;
      const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
      return digitoVerificador === parseInt(id.charAt(8), 10);
    }

    // Sociedad Privada / Jurídica (tercer dígito = 9)
    if (tercerDigito === 9) {
      if (!id.endsWith('001')) return false;
      const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
      let suma = 0;
      for (let i = 0; i < 9; i++) {
        suma += parseInt(id.charAt(i), 10) * coeficientes[i];
      }
      const residuo = suma % 11;
      const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
      return digitoVerificador === parseInt(id.charAt(9), 10);
    }

    return false;
  }

  return true;
}

/**
 * Valida un conjunto de compras y ventas de un periodo antes de la generación del ATS
 */
function validateAtsData({ client, year, month, compras = [], ventas = [] }) {
  const errors = [];
  const warnings = [];

  // 1. Validación del Informante
  if (!client) {
    errors.push('No se ha seleccionado el cliente informante.');
    return { isValid: false, errors, warnings };
  }

  const ruc = (client.ruc || '').trim();
  if (!ruc) {
    errors.push('El RUC del informante es obligatorio.');
  } else if (!/^\d{13}$/.test(ruc)) {
    errors.push(`El RUC del informante (${ruc}) debe tener exactamente 13 dígitos numéricos.`);
  } else if (!ruc.endsWith('001')) {
    errors.push(`El RUC del informante (${ruc}) debe terminar en 001.`);
  } else if (!validarIdentificacionEcuador(ruc, 'RUC')) {
    warnings.push(`El RUC del informante (${ruc}) no supera la verificación algorítmica de dígito verificador.`);
  }

  // 2. Validación del Período
  const anioNum = parseInt(year, 10);
  if (isNaN(anioNum) || anioNum < 2002 || anioNum > 2099) {
    errors.push(`Año del período inválido: ${year}. Debe ser mayor o igual a 2002.`);
  }

  const mesStr = String(month).match(/\b(\d{1,2})\b/);
  if (!mesStr) {
    errors.push(`Mes del período inválido: ${month}. Debe ser un valor entre 01 y 12.`);
  } else {
    const mesNum = parseInt(mesStr[1], 10);
    if (mesNum < 1 || mesNum > 12) {
      errors.push(`Mes del período fuera de rango (01-12): ${month}.`);
    }
  }

  // 3. Totales y acumuladores
  let totalMontoCompras = 0.0;
  let totalIvaCompras = 0.0;
  let totalMontoVentas = 0.0;
  let totalIvaVentas = 0.0;

  const umbralFormaPago = (SRI_LIMITES && SRI_LIMITES.UMBRAL_FORMA_PAGO_USD) || 500.00;

  // 4. Validación de Compras
  compras.forEach((c, idx) => {
    const numFila = idx + 1;
    const emisor = c.emisor || {};
    const valores = c.valores || {};
    const idProv = (emisor.ruc || '').trim();
    const serie = c.serie || `${c.estab || '001'}-${c.ptoEmi || '001'}-${c.secuencial || '000000001'}`;

    if (!idProv) {
      errors.push(`Compra fila ${numFila} (${serie}): Identificación del proveedor vacía.`);
    } else if (idProv.length === 13 && !validarIdentificacionEcuador(idProv, 'RUC')) {
      warnings.push(`Compra fila ${numFila} (${serie}): RUC proveedor (${idProv}) con dígito verificador inconsistente.`);
    } else if (idProv.length === 10 && !validarIdentificacionEcuador(idProv, 'CEDULA')) {
      warnings.push(`Compra fila ${numFila} (${serie}): Cédula proveedor (${idProv}) con dígito verificador inconsistente.`);
    }

    const b0 = parseFloat(valores.base0) || 0;
    const bg = parseFloat(valores.baseGravada) || 0;
    const bNoObj = parseFloat(valores.baseNoObjeto) || 0;
    const bExe = parseFloat(valores.baseExenta) || 0;
    const iva = parseFloat(valores.montoIva) || 0;
    const totalDoc = parseFloat(valores.total) || (b0 + bg + bNoObj + bExe + iva);

    totalMontoCompras += (b0 + bg + bNoObj + bExe);
    totalIvaCompras += iva;

    if (b0 === 0 && bg === 0 && bNoObj === 0 && bExe === 0 && totalDoc > 0) {
      warnings.push(`Compra fila ${numFila} (${serie}): Todas las bases imponibles están en 0.00.`);
    }

    // Regla de Forma de Pago para compras mayores a $500
    if (totalDoc > umbralFormaPago) {
      const formaPago = c.formaPago;
      if (!formaPago) {
        warnings.push(`Compra fila ${numFila} (${serie}): Total $${totalDoc.toFixed(2)} supera $${umbralFormaPago.toFixed(2)} y no tiene forma de pago asignada (se asignará 20 por defecto).`);
      }
    }
  });

  // 5. Validación de Ventas
  ventas.forEach((v, idx) => {
    const numFila = idx + 1;
    const comprador = v.comprador || {};
    const valores = v.valores || {};
    const idCliente = (comprador.identificacion || '').trim();
    const serie = v.serie || `${v.estab || '001'}-${v.ptoEmi || '001'}-${v.secuencial || '000000001'}`;

    if (!idCliente) {
      warnings.push(`Venta fila ${numFila} (${serie}): Identificación cliente vacía, se asignará Consumidor Final 9999999999999.`);
    }

    const b0 = parseFloat(valores.base0) || 0;
    const bg = parseFloat(valores.baseGravada) || 0;
    const bNoObj = parseFloat(valores.baseNoObjeto) || 0;
    const iva = parseFloat(valores.montoIva) || 0;
    const totalDoc = parseFloat(valores.total) || (b0 + bg + bNoObj + iva);

    totalMontoVentas += (b0 + bg + bNoObj);
    totalIvaVentas += iva;

    if (totalDoc > umbralFormaPago && !v.formaPago) {
      warnings.push(`Venta fila ${numFila} (${serie}): Total $${totalDoc.toFixed(2)} supera $${umbralFormaPago.toFixed(2)} sin forma de pago explícita (se asignará 20).`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      sinMovimiento: (compras.length === 0 && ventas.length === 0),
      totalCompras: compras.length,
      totalVentas: ventas.length,
      montoTotalCompras: parseFloat(totalMontoCompras.toFixed(2)),
      montoTotalVentas: parseFloat(totalMontoVentas.toFixed(2)),
      totalIvaCompras: parseFloat(totalIvaCompras.toFixed(2)),
      totalIvaVentas: parseFloat(totalIvaVentas.toFixed(2))
    }
  };
}

module.exports = {
  validarIdentificacionEcuador,
  validateAtsData
};
