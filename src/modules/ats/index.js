/**
 * Módulo Autónomo de Anexo Transaccional Simplificado (ATS) - SRI Ecuador
 * TRIBU - Asistente Contable
 * 
 * Este módulo encapsula:
 * - Lectura y parseo de comprobantes electrónicos XML
 * - Descubrimiento automático de carpetas y periodos
 * - Generación del XML y ZIP oficial de ATS conforme al estándar del SRI (RIG)
 * - Validación normativa y algorítmica previa a la carga
 * - Exportación de resúmenes y reportes a CSV/Excel
 * - Registro de canales de comunicación IPC con el proceso principal
 */

const xmlParser = require('./xmlParser');
const atsGenerator = require('./atsGenerator');
const atsValidator = require('./atsValidator');
const csvExporter = require('./csvExporter');
const constants = require('./constants');
const taxReconciler = require('./taxReconciler');
const atsPhysicalDocsManager = require('./atsPhysicalDocsManager');
const atsAnuladosManager = require('./atsAnuladosManager');

class AtsModule {
  constructor() {
    this.name = 'ats-module';
    this.version = '1.2.0';
  }

  /**
   * Registra los manejadores IPC del módulo en el proceso principal de Electron
   * Permite desacoplar totalmente main.js de la lógica de negocio de este módulo
   */
  registerIpc(ipcMain) {
    if (!ipcMain) {
      throw new Error('Se requiere la instancia de ipcMain para registrar el módulo ATS');
    }

    // 1. Descubrimiento y carga de periodos y XMLs
    ipcMain.handle('ats:get-available-periods', async (event, clientFolder) => {
      return xmlParser.getAvailablePeriods(clientFolder);
    });

    ipcMain.handle('ats:load-period-xmls', async (event, params) => {
      if (params && params.clientFolder) {
        return xmlParser.loadPeriodXmls(params.clientFolder, params);
      }
      return xmlParser.loadPeriodXmls(params);
    });

    ipcMain.handle('ats:parse-single-xml', async (event, filePath) => {
      return xmlParser.parseXmlFile(filePath);
    });

    // 2. Validación normativa del período
    ipcMain.handle('ats:validate-period', async (event, { client, year, month, compras, ventas }) => {
      return atsValidator.validateAtsData({ client, year, month, compras, ventas });
    });

    // 3. Generación del XML y ZIP del ATS oficial
    ipcMain.handle('ats:generate-xml', async (event, { client, year, month, compras, ventas, retenciones, comprobantesFisicos, anulados }) => {
      return atsGenerator.generateAtsXml({ client, year, month, compras, ventas, retenciones, comprobantesFisicos, anulados });
    });

    // 4. Exportación de comprobantes a CSV para Excel
    ipcMain.handle('ats:export-csv', async (event, { client, category, year, month, items }) => {
      return csvExporter.exportToCsv({ client, category, year, month, items });
    });

    // 5. Catálogos oficiales (para inicialización o consultas del frontend)
    ipcMain.handle('ats:get-constants', async () => {
      return constants;
    });

    // 6. Conciliación Tributaria (Punto G: ATS vs Formulario 104 y Formulario 103)
    ipcMain.handle('ats:reconcile-declaraciones', async (event, params) => {
      return taxReconciler.reconcileAtsWithDeclaraciones(params);
    });

    // 7. Gestión de Comprobantes Físicos (Notas de Venta RIMPE, Facturas Físicas, Peajes)
    ipcMain.handle('ats:get-physical-docs', async (event, { clientFolder, year, month }) => {
      return atsPhysicalDocsManager.getPhysicalDocsForPeriod(clientFolder, year, month);
    });

    ipcMain.handle('ats:save-physical-doc', async (event, { clientFolder, docData }) => {
      return atsPhysicalDocsManager.savePhysicalDoc(clientFolder, docData);
    });

    ipcMain.handle('ats:delete-physical-doc', async (event, { clientFolder, docId }) => {
      return atsPhysicalDocsManager.deletePhysicalDoc(clientFolder, docId);
    });

    // 8. Gestión de Comprobantes Anulados
    ipcMain.handle('ats:get-anulados', async (event, { clientFolder, year, month }) => {
      return atsAnuladosManager.getAnuladosForPeriod(clientFolder, year, month);
    });

    ipcMain.handle('ats:save-anulado', async (event, { clientFolder, anuladoData }) => {
      return atsAnuladosManager.saveAnulado(clientFolder, anuladoData);
    });

    ipcMain.handle('ats:delete-anulado', async (event, { clientFolder, id }) => {
      return atsAnuladosManager.deleteAnulado(clientFolder, id);
    });

    // Compatibilidad retroactiva con canales legacy si existieran
    ipcMain.handle('xml:get-available-periods', async (event, clientFolder) => {
      return xmlParser.getAvailablePeriods(clientFolder);
    });

    ipcMain.handle('xml:load-period', async (event, { clientFolder, category, year, month }) => {
      return xmlParser.loadPeriodXmls(clientFolder, { category, year, month });
    });
  }

  // Métodos de servicio directos (para pruebas unitarias o llamadas internas)
  parseXmlFile(filePath) {
    return xmlParser.parseXmlFile(filePath);
  }

  loadPeriodXmls(clientFolder, options) {
    return xmlParser.loadPeriodXmls(clientFolder, options);
  }

  getAvailablePeriods(clientFolder) {
    return xmlParser.getAvailablePeriods(clientFolder);
  }

  validateAtsData(params) {
    return atsValidator.validateAtsData(params);
  }

  generateAtsXml(params) {
    return atsGenerator.generateAtsXml(params);
  }

  exportToCsv(params) {
    return csvExporter.exportToCsv(params);
  }

  getConstants() {
    return constants;
  }

  reconcileAtsWithDeclaraciones(params) {
    return taxReconciler.reconcileAtsWithDeclaraciones(params);
  }

  getPhysicalDocsForPeriod(clientFolder, year, month) {
    return atsPhysicalDocsManager.getPhysicalDocsForPeriod(clientFolder, year, month);
  }

  savePhysicalDoc(clientFolder, docData) {
    return atsPhysicalDocsManager.savePhysicalDoc(clientFolder, docData);
  }

  deletePhysicalDoc(clientFolder, docId) {
    return atsPhysicalDocsManager.deletePhysicalDoc(clientFolder, docId);
  }

  getAnuladosForPeriod(clientFolder, year, month) {
    return atsAnuladosManager.getAnuladosForPeriod(clientFolder, year, month);
  }

  saveAnulado(clientFolder, data) {
    return atsAnuladosManager.saveAnulado(clientFolder, data);
  }

  deleteAnulado(clientFolder, id) {
    return atsAnuladosManager.deleteAnulado(clientFolder, id);
  }
}

const atsModuleInstance = new AtsModule();

module.exports = atsModuleInstance;
