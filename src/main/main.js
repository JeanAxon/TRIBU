const { app, BrowserWindow, ipcMain, dialog, shell, session, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const isMac = process.platform === 'darwin';
const autoUpdater = isMac ? require('./macUpdater') : require('electron-updater').autoUpdater;

// Fijar nombre de la aplicación y ruta userData consistente en todas las instancias y reinicios
app.setName('tribu-sri');
try {
  const expectedUserData = path.join(app.getPath('appData'), 'tribu-sri');
  if (app.getPath('userData') !== expectedUserData) {
    app.setPath('userData', expectedUserData);
  }
} catch (e) {
  console.warn('Aviso al configurar userData:', e.message);
}

const securityModule = require('../modules/security');
const DownloadManager = require('./downloadManager');
const sriAutomation = require('../injected/sriAutomation');
const atsModule = require('../modules/ats');
const declaracionesModule = require('../modules/declaraciones');

let mainWindow = null;
let downloadManager = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    title: 'TRIBU - Asistente Contable y Descargas SRI Ecuador',
    icon: path.join(__dirname, '../renderer/assets/icon.png'),
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      plugins: true,
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false
    }
  });

  downloadManager = new DownloadManager(mainWindow);
  downloadManager.attachToSession(session.defaultSession);

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Configuración de IPC Handlers
function setupIpcHandlers() {
  // =============================================================
  // REGISTRO DE MÓDULOS DE NEGOCIO, SEGURIDAD Y ATS
  // =============================================================
  securityModule.registerIpc(ipcMain);
  atsModule.registerIpc(ipcMain);
  declaracionesModule.registerIpc(ipcMain);

  // Diálogo para seleccionar carpeta
  ipcMain.handle('dialog:select-folder', async (event, defaultPath) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar Carpeta Base para Clientes SRI',
      defaultPath: defaultPath || securityModule.clientStorage.getBaseFolder(),
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Abrir carpeta en el Explorador de Windows
  ipcMain.handle('shell:open-folder', async (event, folderPath) => {
    if (folderPath) {
      await shell.openPath(folderPath);
      return true;
    }
    return false;
  });

  // Configurar destino de descarga con categoría (Ventas/Compras)
  ipcMain.handle('download:set-target', async (event, { client, customFolder, organizeByType, category }) => {
    const targetFolder = customFolder || (client ? client.defaultFolder : securityModule.clientStorage.getBaseFolder());
    downloadManager.setTarget(client, targetFolder, {
      organizeByType: organizeByType !== false,
      category: category
    });
    
    if (client && client.ruc) {
      const clientSession = session.fromPartition(`persist:sri_${client.ruc}`);
      downloadManager.attachToSession(clientSession);
    }
    return true;
  });

  ipcMain.handle('download:set-category', async (event, category) => {
    downloadManager.setCategory(category);
    return true;
  });

  ipcMain.handle('download:set-expected-info', async (event, info) => {
    downloadManager.setExpectedFileInfo(info);
    return true;
  });

  ipcMain.handle('download:reset-stats', async () => {
    downloadManager.resetStats();
    return true;
  });

  ipcMain.handle('download:get-stats', async () => {
    return downloadManager.getStats();
  });

  ipcMain.handle('download:set-bulk-mode', async (event, isBulk) => {
    if (downloadManager) {
      downloadManager.setBulkMode(isBulk);
    }
    return true;
  });

  ipcMain.handle('preview:save-file', async (event, params) => {
    if (downloadManager) {
      return downloadManager.savePreviewFile(params);
    }
    throw new Error('DownloadManager no inicializado');
  });

  ipcMain.handle('shell:open-path', async (event, filePath) => {
    if (filePath) {
      await shell.openPath(filePath);
      return true;
    }
    return false;
  });

  ipcMain.handle('sri:get-ride-interceptor-script', async () => {
    return getAutomationModule().getSriRideInterceptorScript();
  });

  // Función auxiliar para obtener scripts frescos sin problemas de caché de Node.js
  function getAutomationModule() {
    try {
      const resolved = require.resolve('../injected/sriAutomation');
      delete require.cache[resolved];
    } catch (e) {}
    return require('../injected/sriAutomation');
  }

  // Generadores de scripts de automatización SRI
  ipcMain.handle('sri:get-login-script', async (event, { ruc, password }) => {
    return getAutomationModule().getLoginScript(ruc, password);
  });

  ipcMain.handle('sri:get-capture-script', async () => {
    return getAutomationModule().getPasswordCaptureScript();
  });

  ipcMain.handle('sri:get-inspect-script', async () => {
    return getAutomationModule().getInspectComprobantesScript();
  });

  ipcMain.handle('sri:get-click-row-script', async (event, rowIndex) => {
    return getAutomationModule().getClickRowXmlScript(rowIndex);
  });

  ipcMain.handle('sri:get-next-page-script', async () => {
    return getAutomationModule().getNextPageScript();
  });

  ipcMain.handle('sri:get-inspect-discapacidad-script', async () => {
    return getAutomationModule().getInspectDiscapacidadTableScript();
  });

  ipcMain.handle('sri:get-apply-discapacidad-script', async (event, config) => {
    return getAutomationModule().getApplyDiscapacidadIvaScript(config);
  });

  ipcMain.handle('sri:get-activate-all-reclamo-rows-script', async () => {
    return getAutomationModule().getActivateAllReclamoRowsScript();
  });

  ipcMain.handle('sri:get-process-reclamo-row-script', async (event, rowIndex) => {
    return getAutomationModule().getProcessReclamoRowScript(rowIndex);
  });

  ipcMain.handle('sri:get-inspect-declaracion-script', async () => {
    return getAutomationModule().getInspectDeclaracionPageScript();
  });

  ipcMain.handle('sri:get-fill-profiling-script', async (event, respuestas) => {
    return getAutomationModule().getFillDeclaracionProfilingScript(respuestas);
  });

  ipcMain.handle('sri:get-fill-casilleros-script', async (event, casilleros) => {
    return getAutomationModule().getFillDeclaracionCasillerosScript(casilleros);
  });

  ipcMain.handle('sri:get-navigate-script', async (event, target) => {
    return getAutomationModule().getNavigateToSriSectionScript(target);
  });

  ipcMain.handle('sri:get-ventas-filter-info-script', async () => {
    return getAutomationModule().getVentasFilterInfoScript();
  });

  ipcMain.handle('sri:get-set-ventas-date-script', async (event, dateStr) => {
    return getAutomationModule().getSetVentasDateAndSearchScript(dateStr);
  });

  ipcMain.handle('sri:save-emitted-invoice-xml', async (event, { client, year, month, filename, invoice }) => {
    try {
      if (!client || !client.defaultFolder) {
        throw new Error('Cliente o carpeta predeterminada no configurada.');
      }

      const yearStr = String(year || new Date().getFullYear());
      const monthStr = String(month || 'Mes');
      const targetFolder = path.join(client.defaultFolder, 'Ventas', yearStr, monthStr);
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

      const safeFilename = filename && filename.toLowerCase().endsWith('.xml') ? filename : `${filename || 'Factura'}.xml`;
      const fullPath = path.join(targetFolder, safeFilename);

      const ruc = client.ruc || '';
      const razonSocial = client.razonSocial || 'CONTRIBUYENTE';
      const claveAcceso = invoice.claveAcceso || '';
      const fechaHora = invoice.fechaHoraAutorizacion || `${invoice.fechaEmision || ''} 12:00:00`;
      const fechaEmision = invoice.fechaEmision || '';

      const serieMatch = (invoice.tipoSerie || invoice.numeroComprobante || '').match(/(\d{3})-(\d{3})-(\d{9})/);
      const estab = serieMatch ? serieMatch[1] : (claveAcceso.length >= 30 ? claveAcceso.substring(24, 27) : '001');
      const ptoEmi = serieMatch ? serieMatch[2] : (claveAcceso.length >= 30 ? claveAcceso.substring(27, 30) : '001');
      const secuencial = serieMatch ? serieMatch[3] : (claveAcceso.length >= 39 ? claveAcceso.substring(30, 39) : '000000001');

      const baseGravada = parseFloat(invoice.valorSinImpuestos) || 0.0;
      const montoIva = parseFloat(invoice.montoIva) || 0.0;
      const importeTotal = parseFloat(invoice.importeTotal) || (baseGravada + montoIva);

      const tarifaPorc = baseGravada > 0 ? ((montoIva / baseGravada) * 100).toFixed(2) : '15.00';
      const codPorc = (Math.round(parseFloat(tarifaPorc)) === 15) ? '4' : ((Math.round(parseFloat(tarifaPorc)) === 12) ? '2' : '0');

      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<autorizacion>
  <estado>AUTORIZADO</estado>
  <numeroAutorizacion>${claveAcceso}</numeroAutorizacion>
  <fechaAutorizacion>${fechaHora}</fechaAutorizacion>
  <comprobante><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>2</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${razonSocial}</razonSocial>
    <ruc>${ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${estab}</estab>
    <ptoEmi>${ptoEmi}</ptoEmi>
    <secuencial>${secuencial}</secuencial>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${fechaEmision}</fechaEmision>
    <totalSinImpuestos>${baseGravada.toFixed(2)}</totalSinImpuestos>
    <totalDescuento>0.00</totalDescuento>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>${codPorc}</codigoPorcentaje>
        <baseImponible>${baseGravada.toFixed(2)}</baseImponible>
        <tarifa>${tarifaPorc}</tarifa>
        <valor>${montoIva.toFixed(2)}</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <importeTotal>${importeTotal.toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
      <pago>
        <formaPago>20</formaPago>
        <total>${importeTotal.toFixed(2)}</total>
      </pago>
    </pagos>
  </infoFactura>
</factura>]]></comprobante>
</autorizacion>`;

      fs.writeFileSync(fullPath, xmlContent, 'utf8');

      if (downloadManager) {
        downloadManager.stats.completed++;
        downloadManager.stats.xmlCount++;
        downloadManager._notifyStats();
      }

      return { success: true, filePath: fullPath, filename: safeFilename };
    } catch (e) {
      console.error('Error guardando XML de venta emitida:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sri:dump-debug', async (event, data) => {
    try {
      const p = path.join(process.cwd(), 'live_debug_sri.json');
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
      console.log('[DEBUG SRI] Guardado volcado de depuración en:', p);
    } catch (e) {
      console.warn('[DEBUG SRI] Error guardando volcado:', e);
    }
    return true;
  });

  ipcMain.handle('shell:show-item-in-folder', async (event, fullPath) => {
    if (fullPath) {
      shell.showItemInFolder(fullPath);
      return true;
    }
    return false;
  });

  // Manejadores de Versión y Actualización Automática (Auto-Updater)
  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.handle('updater:check', async () => {
    if (app.isPackaged) {
      return autoUpdater.checkForUpdates();
    }
    return { status: 'dev-mode' };
  });

  ipcMain.handle('updater:quit-and-install', async () => {
    if (isMac) {
      autoUpdater.quitAndInstall();
    } else {
      // isSilent: true (actualización silenciosa sin asistente de reinstalación)
      // isForceRunAfter: true (reinicia inmediatamente la app actualizada)
      autoUpdater.quitAndInstall(true, true);
    }
    return true;
  });
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Comprobando actualizaciones en GitHub...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', { status: 'checking' });
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Nueva versión disponible en GitHub:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', {
        status: 'available',
        version: info.version
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] TRIBU está en la versión más reciente.');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', { status: 'not-available' });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', {
        status: 'downloading',
        percent: Math.round(progressObj.percent)
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Actualización lista para instalar:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', {
        status: 'downloaded',
        version: info.version
      });
    }
  });

  autoUpdater.on('error', (err) => {
    console.warn('[AutoUpdater] Aviso comprobando actualizaciones:', err ? err.message : err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', {
        status: 'error',
        message: err ? err.message : 'Error desconocido'
      });
    }
  });

  if (app.isPackaged) {
    // Comprobación inicial a los 4.5 segundos de abrir la app
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(e => {
        console.warn('[AutoUpdater] Excepción al comprobar actualización:', e.message);
      });
    }, 4500);

    // Comprobación periódica cada 2 horas mientras la app permanezca abierta
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(e => {
        console.warn('[AutoUpdater] Excepción en comprobación periódica de actualización:', e.message);
      });
    }, 2 * 60 * 60 * 1000);
  }
}

function setupNativeMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: 'TRIBU',
      submenu: [
        { role: 'about', label: 'Acerca de TRIBU' },
        { type: 'separator' },
        { role: 'services', label: 'Servicios' },
        { type: 'separator' },
        { role: 'hide', label: 'Ocultar TRIBU' },
        { role: 'hideOthers', label: 'Ocultar otros' },
        { role: 'unhide', label: 'Mostrar todo' },
        { type: 'separator' },
        { role: 'quit', label: 'Salir de TRIBU' }
      ]
    }] : []),
    {
      label: 'Archivo',
      submenu: [
        isMac ? { role: 'close', label: 'Cerrar ventana' } : { role: 'quit', label: 'Salir' }
      ]
    },
    {
      label: 'Edición',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Forzar recarga' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollador' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamaño original' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Maximizar' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: 'Traer al frente' },
          { type: 'separator' },
          { role: 'window', label: 'Ventana' }
        ] : [
          { role: 'close', label: 'Cerrar' }
        ])
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Repositorio en GitHub',
          click: async () => {
            await shell.openExternal('https://github.com/JeanAxon/TRIBU');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  setupNativeMenu();
  setupIpcHandlers();
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
