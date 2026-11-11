/**
 * Catálogos y Constantes Oficiales SRI Ecuador para el Anexo Transaccional Simplificado (ATS)
 */

const TIPO_COMPROBANTE = {
  '01': 'Factura',
  '02': 'Nota de Venta',
  '03': 'Liquidación de Compra',
  '04': 'Nota de Crédito',
  '05': 'Nota de Débito',
  '06': 'Guía de Remisión',
  '07': 'Comprobante de Retención',
  '18': 'Factura Electrónica (ATS Ventas)'
};

const SUSTENTO_TRIBUTARIO = [
  { code: '01', label: '01 - Crédito Tributario para declaración de IVA (Bienes y Servicios)' },
  { code: '02', label: '02 - Costo o Gasto para declaración de Impuesto a la Renta' },
  { code: '03', label: '03 - Activo Fijo (Crédito Tributario de IVA)' },
  { code: '04', label: '04 - Liquidación de Compra de Bienes o Prestación de Servicios' },
  { code: '05', label: '05 - Pago a No Domiciliados' },
  { code: '06', label: '06 - Crédito Tributario en Régimen Simplificado (RIMPE)' },
  { code: '07', label: '07 - Comprobantes de Venta Físicos de Proveedores Especiales' },
  { code: '00', label: '00 - No aplica' }
];

const TIPO_IDENTIFICACION_PROVEEDOR = {
  RUC: '01',
  CEDULA: '02',
  PASAPORTE: '03'
};

const TIPO_PROVEEDOR = {
  PERSONA_NATURAL: '01',
  SOCIEDAD: '02'
};

const FORMAS_DE_PAGO = {
  '01': 'Sin utilización del sistema financiero',
  '15': 'Compensación de deudas',
  '16': 'Tarjeta de débito',
  '17': 'Dinero electrónico',
  '18': 'Tarjeta prepago',
  '19': 'Tarjeta de crédito',
  '20': 'Otros con utilización del sistema financiero',
  '21': 'Endoso de títulos'
};

const MESES = [
  { num: '01', name: '01 - Enero' },
  { num: '02', name: '02 - Febrero' },
  { num: '03', name: '03 - Marzo' },
  { num: '04', name: '04 - Abril' },
  { num: '05', name: '05 - Mayo' },
  { num: '06', name: '06 - Junio' },
  { num: '07', name: '07 - Julio' },
  { num: '08', name: '08 - Agosto' },
  { num: '09', name: '09 - Septiembre' },
  { num: '10', name: '10 - Octubre' },
  { num: '11', name: '11 - Noviembre' },
  { num: '12', name: '12 - Diciembre' }
];

module.exports = {
  TIPO_COMPROBANTE,
  SUSTENTO_TRIBUTARIO,
  TIPO_IDENTIFICACION_PROVEEDOR,
  TIPO_PROVEEDOR,
  FORMAS_DE_PAGO,
  MESES
};
