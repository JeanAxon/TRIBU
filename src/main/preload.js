const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tribuApi', {
  // Manejo de Clientes
  getClients: () => ipcRenderer.invoke('client:get-all'),
  saveClient: (clientData, options) => ipcRenderer.invoke('client:save', clientData, options),
  checkDuplicateClient: (clientData, excludeId) => ipcRenderer.invoke('client:check-duplicate', { clientData, excludeId }),
  deleteClient: (id) => ipcRenderer.invoke('client:delete', id),
  getCredentials: (id) => ipcRenderer.invoke('client:get-credentials', id),
  updateLastLogin: (id) => ipcRenderer.invoke('client:update-last-login', id),

  // Carpeta Base Global de Clientes
  getBaseFolder: () => ipcRenderer.invoke('client:get-base-folder'),
  setBaseFolder: (newFolder) => ipcRenderer.invoke('client:set-base-folder', newFolder),

  // Sistema de Archivos y Carpetas
  selectFolder: (defaultPath) => ipcRenderer.invoke('dialog:select-folder', defaultPath),
  openFolderInExplorer: (folderPath) => ipcRenderer.invoke('shell:open-folder', folderPath),
  showItemInFolder: (fullPath) => ipcRenderer.invoke('shell:show-item-in-folder', fullPath),

  // Control de Descargas y Sesión
  configureDownloadTarget: (config) => ipcRenderer.invoke('download:set-target', config),
  setDownloadCategory: (category) => ipcRenderer.invoke('download:set-category', category),
  setExpectedFileInfo: (info) => ipcRenderer.invoke('download:set-expected-info', info),
  resetDownloadStats: () => ipcRenderer.invoke('download:reset-stats'),

  // Scripts de Automatización SRI
  getLoginScript: (ruc, password) => ipcRenderer.invoke('sri:get-login-script', { ruc, password }),
  getPasswordCaptureScript: () => ipcRenderer.invoke('sri:get-capture-script'),
  getInspectScript: () => ipcRenderer.invoke('sri:get-inspect-script'),
  getClickRowXmlScript: (rowIndex) => ipcRenderer.invoke('sri:get-click-row-script', rowIndex),
  getClickRowScript: (rowIndex) => ipcRenderer.invoke('sri:get-click-row-script', rowIndex),
  getNextPageScript: () => ipcRenderer.invoke('sri:get-next-page-script'),
  getInspectDiscapacidadScript: () => ipcRenderer.invoke('sri:get-inspect-discapacidad-script'),
  getApplyDiscapacidadScript: (config) => ipcRenderer.invoke('sri:get-apply-discapacidad-script', config),
  getProcessReclamoRowScript: (rowIndex) => ipcRenderer.invoke('sri:get-process-reclamo-row-script', rowIndex),
  dumpDebug: (data) => ipcRenderer.invoke('sri:dump-debug', data),

  // =============================================================
  // MÓDULO ATS & VISOR DE COMPROBANTES XML
  // =============================================================
  getAvailablePeriods: (clientFolder) => ipcRenderer.invoke('ats:get-available-periods', clientFolder),
  loadPeriodXmls: (params) => ipcRenderer.invoke('ats:load-period-xmls', params),
  generateAtsXml: (params) => ipcRenderer.invoke('ats:generate-xml', params),
  exportToCsv: (params) => ipcRenderer.invoke('ats:export-csv', params),
  getAtsConstants: () => ipcRenderer.invoke('ats:get-constants'),

  // Suscripción a eventos en tiempo real
  onDownloadStarted: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-started', handler);
    return () => ipcRenderer.removeListener('download-started', handler);
  },
  onDownloadProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  onDownloadCompleted: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-completed', handler);
    return () => ipcRenderer.removeListener('download-completed', handler);
  },
  onDownloadFailed: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-failed', handler);
    return () => ipcRenderer.removeListener('download-failed', handler);
  },
  onDownloadStatsUpdate: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-stats-update', handler);
    return () => ipcRenderer.removeListener('download-stats-update', handler);
  },

  // Sistema de Actualizaciones Automáticas y Versión
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('updater:quit-and-install'),
  onUpdaterStatus: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('updater:status', handler);
    return () => ipcRenderer.removeListener('updater:status', handler);
  }
});
