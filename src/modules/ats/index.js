/**
 * Módulo Autónomo de Anexo Transaccional Simplificado (ATS) - SRI Ecuador
 * TRIBU - Asistente Contable
 * 
 * Este módulo encapsula:
 * - Lectura y parseo de comprobantes electrónicos XML
 * - Descubrimiento automático de carpetas y periodos
 * - Generación del XML oficial de ATS conforme al estándar del SRI
 * - Exportación de resúmenes y reportes a CSV/Excel
 * - Registro de canales de comunicación IPC con el proceso principal
 */

const xmlParser = require('./xmlParser');
const atsGenerator = require('./atsGenerator');
const csvExporter = require('./csvExporter');
const constants = require('./constants');

class AtsModule {
  constructor() {
    this.name = 'ats-module';
    this.version = '1.0.0';
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

    // 2. Generación del XML del ATS oficial
    ipcMain.handle('ats:generate-xml', async (event, { client, year, month, compras, ventas }) => {
      return atsGenerator.generateAtsXml({ client, year, month, compras, ventas });
    });

    // 3. Exportación de comprobantes a CSV para Excel
    ipcMain.handle('ats:export-csv', async (event, { client, category, year, month, items }) => {
      return csvExporter.exportToCsv({ client, category, year, month, items });
    });

    // 4. Catálogos oficiales (para inicialización o consultas del frontend)
    ipcMain.handle('ats:get-constants', async () => {
      return constants;
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

  generateAtsXml(params) {
    return atsGenerator.generateAtsXml(params);
  }

  exportToCsv(params) {
    return csvExporter.exportToCsv(params);
  }

  getConstants() {
    return constants;
  }
}

const atsModuleInstance = new AtsModule();

module.exports = atsModuleInstance;
