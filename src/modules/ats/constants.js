/**
 * Catálogos y Constantes Oficiales SRI Ecuador para el Anexo Transaccional Simplificado (ATS)
 * Conforme a la Ficha Técnica Oficial y Catálogo ATS del Servicio de Rentas Internas
 */

const TIPO_COMPROBANTE = {
  '01': 'Factura',
  '02': 'Nota o Boleta de Venta',
  '03': 'Liquidación de Compra de Bienes o Prestación de Servicios',
  '04': 'Nota de Crédito',
  '05': 'Nota de Débito',
  '06': 'Guía de Remisión',
  '07': 'Comprobante de Retención',
  '08': 'Boletos o Entradas a Espectáculos Públicos',
  '09': 'Tiquetes o Vales de Máquinas Registradoras',
  '11': 'Pasajes Aéreos',
  '12': 'Documentos Emitidos por Instituciones Financieras',
  '15': 'Comprobante de Venta Emitido en el Exterior',
  '16': 'Formulario Único de Exportación (FUE / DAU)',
  '18': 'Documentos Autorizados en Ventas (ATS)',
  '19': 'Comprobantes de Pago de Cuotas o Aportes',
  '20': 'Documentos por Servicios Administrativos del Estado',
  '41': 'Comprobante de Venta Emitido por Reembolso'
};

const SUSTENTO_TRIBUTARIO = [
  { code: '01', label: '01 - Crédito Tributario para declaración de IVA (Bienes y Servicios)' },
  { code: '02', label: '02 - Costo o Gasto para declaración de IR (sin derecho a crédito tributario)' },
  { code: '03', label: '03 - Activo Fijo con derecho a Crédito Tributario de IVA' },
  { code: '04', label: '04 - Activo Fijo sin derecho a Crédito Tributario (Costo o Gasto)' },
  { code: '05', label: '05 - Liquidación Gastos de Viaje, Hospedaje y Alimentación' },
  { code: '06', label: '06 - Inventario con derecho a Crédito Tributario de IVA' },
  { code: '07', label: '07 - Inventario sin derecho a Crédito Tributario (Costo o Gasto)' },
  { code: '08', label: '08 - Valor pagado para solicitar Reembolso de Gasto (Intermediario)' },
  { code: '09', label: '09 - Reembolso por Siniestros (Aseguradoras)' },
  { code: '10', label: '10 - Distribución de Dividendos o Utilidades' },
  { code: '11', label: '11 - Convenios de débito o recaudación para IFIs' },
  { code: '12', label: '12 - Impuestos y retenciones presuntivos / Pronósticos Deportivos' },
  { code: '13', label: '13 - Valores reconocidos por entidades del sector público' },
  { code: '14', label: '14 - Facturado por socios a operadoras de transporte' },
  { code: '15', label: '15 - Pagos por consumos propios y de terceros de servicios digitales' },
  { code: '00', label: '00 - Casos especiales cuyo sustento no aplica en opciones anteriores' }
];

const TIPO_IDENTIFICACION_PROVEEDOR = {
  RUC: '01',
  CEDULA: '02',
  PASAPORTE: '03'
};

const TIPO_IDENTIFICACION_CLIENTE = {
  RUC: '04',
  CEDULA: '05',
  PASAPORTE: '06',
  CONSUMIDOR_FINAL: '07',
  PLACA: '19'
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

const CONCEPTOS_RETENCION_AIR = [
  { code: '303', label: '303 - Honorarios profesionales personas naturales (10%)', percent: 10 },
  { code: '303A', label: '303A - Servicios profesionales prestados por sociedades residentes (3%)', percent: 3 },
  { code: '304', label: '304 - Servicios profesionales prestados por sociedades (10%)', percent: 10 },
  { code: '304A', label: '304A - Comisiones y servicios predomina intelecto no profesionales (10%)', percent: 10 },
  { code: '307', label: '307 - Servicios predomina la mano de obra (2%)', percent: 2 },
  { code: '310', label: '310 - Transporte privado de pasajeros o transporte público/privado de carga (1%)', percent: 1 },
  { code: '311', label: '311 - Pagos a través de liquidación de compra (2%)', percent: 2 },
  { code: '312', label: '312 - Transferencia de bienes muebles de naturaleza corporal (1.75%)', percent: 1.75 },
  { code: '320', label: '320 - Arrendamiento bienes inmuebles (10%)', percent: 10 },
  { code: '322', label: '322 - Seguros y reaseguros (1%)', percent: 1 },
  { code: '332', label: '332 - Otras compras y servicios no sujetas a retención (0%)', percent: 0 },
  { code: '343', label: '343 - Otras retenciones aplicables el 1% (incluye RIMPE Emprendedores)', percent: 1 },
  { code: '3440', label: '3440 - Otras retenciones aplicables el 2.75%', percent: 2.75 }
];

const SRI_LIMITES = {
  MAX_ZIP_SIZE_BYTES: 8 * 1024 * 1024, // 8 MB máximo para carga web en el portal RIG
  MAX_ZIP_SIZE_MB: 8,
  UMBRAL_FORMA_PAGO_USD: 500.00 // Obligatorio registrar forma de pago sobre 500 USD desde dic 2023
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
  TIPO_IDENTIFICACION_CLIENTE,
  TIPO_PROVEEDOR,
  FORMAS_DE_PAGO,
  CONCEPTOS_RETENCION_AIR,
  SRI_LIMITES,
  MESES
};
