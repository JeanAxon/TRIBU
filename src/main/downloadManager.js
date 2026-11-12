const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const MONTH_NAMES = {
  '01': '01 - Enero',
  '02': '02 - Febrero',
  '03': '03 - Marzo',
  '04': '04 - Abril',
  '05': '05 - Mayo',
  '06': '06 - Junio',
  '07': '07 - Julio',
  '08': '08 - Agosto',
  '09': '09 - Septiembre',
  '10': '10 - Octubre',
  '11': '11 - Noviembre',
  '12': '12 - Diciembre'
};

class DownloadManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.activeFolder = null;
    this.activeClient = null;
    this.currentCategory = 'Ventas'; // 'Ventas' o 'Compras'
    this.expectedInfo = null;
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      xmlCount: 0,
      activeDownloads: 0
    };
    this.registeredSessions = new Set();
  }

  setTarget(client, customFolder = null, options = {}) {
    this.activeClient = client;
    this.activeFolder = customFolder || (client ? client.defaultFolder : path.join(app.getPath('documents'), 'SRI_Clientes'));
    this.currentCategory = options.category || this.currentCategory || 'Ventas';
    
    try {
      if (!fs.existsSync(this.activeFolder)) {
        fs.mkdirSync(this.activeFolder, { recursive: true });
      }
    } catch (e) {
      console.error('Error creando carpeta base:', e);
    }
  }

  setCategory(category) {
    if (category) {
      this.currentCategory = category;
    }
  }

  setExpectedFileInfo(info) {
    this.expectedInfo = info;
  }

  _cleanFilename(str) {
    if (!str) return '';
    return str.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
  }

  _parseSriFilename(filename) {
    const match = filename.match(/(\d{49})/);
    if (match) {
      const clave = match[1];
      const monthNum = clave.substring(2, 4);
      const year = clave.substring(4, 8);

      const monthFolder = MONTH_NAMES[monthNum] || `Mes_${monthNum}`;
      return {
        valid: true,
        year: year,
        month: monthFolder,
        clave: clave
      };
    }
    return { valid: false };
  }

  resetStats() {
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      xmlCount: 0,
      activeDownloads: 0
    };
    this.expectedInfo = null;
    this._notifyStats();
  }

  attachToSession(targetSession) {
    if (this.registeredSessions.has(targetSession)) return;
    this.registeredSessions.add(targetSession);

    targetSession.on('will-download', (event, item, webContents) => {
      const originalName = item.getFilename() || '';
      const ext = path.extname(originalName).toLowerCase();
      const mime = (item.getMimeType() || '').toLowerCase();
      
      // SOLO DESCARGAR ARCHIVOS XML (validación por extensión, MIME o contexto de comprobante esperado)
      const isXmlExtension = ext === '.xml';
      const isXmlMime = mime.includes('xml') || mime.includes('octet-stream');
      const isExpected = Boolean(this.expectedInfo);
      const isAcceptableXml = isXmlExtension || isXmlMime || isExpected || originalName.toLowerCase().includes('.xml');

      if (!isAcceptableXml) {
        item.cancel();
        return;
      }

      let saveName = originalName;
      let year = null;
      let month = null;

      // 1. Usar el nombre descriptivo con [Fecha] - [Razón Social/Serie] si está disponible
      if (this.expectedInfo) {
        if (this.expectedInfo.filename) {
          saveName = this.expectedInfo.filename;
        } else if (this.expectedInfo.fechaEmision) {
          const cleanSerie = this._cleanFilename(this.expectedInfo.numeroComprobante || this.expectedInfo.tipoSerie || '');
          const cleanRazon = this.expectedInfo.razonSocial ? this._cleanFilename(this.expectedInfo.razonSocial).substring(0, 60) : '';
          if (cleanRazon && cleanRazon !== 'Venta' && cleanRazon !== 'Proveedor') {
            saveName = `${this.expectedInfo.fechaEmision} - ${cleanRazon}`;
            if (cleanSerie) saveName += ` - ${cleanSerie}`;
          } else if (cleanSerie) {
            saveName = `${this.expectedInfo.fechaEmision} - ${cleanSerie}`;
          } else {
            saveName = `${this.expectedInfo.fechaEmision} - Comprobante`;
          }
          saveName += '.xml';
        }
        
        year = this.expectedInfo.year || (this.expectedInfo.fechaEmision ? this.expectedInfo.fechaEmision.split('-')[0] : null);
        if (this.expectedInfo.month) {
          month = this.expectedInfo.month;
        } else if (this.expectedInfo.fechaEmision) {
          const parts = this.expectedInfo.fechaEmision.split('-');
          if (parts.length >= 2) {
            const m = parts[1].padStart(2, '0');
            month = MONTH_NAMES[m] || `Mes_${m}`;
          }
        }
      }

      if (!year || !month) {
        // Fallback: Si no había expectedInfo completo, intentar extraer de la clave del archivo original
        const sriDate = this._parseSriFilename(originalName);
        if (sriDate.valid) {
          if (!year) year = sriDate.year;
          if (!month) month = sriDate.month;
          if (saveName === originalName) {
            saveName = `${sriDate.clave}.xml`;
          }
        }
      }

      // Asegurar extensión .xml
      if (!saveName.toLowerCase().endsWith('.xml')) {
        saveName += '.xml';
      }

      // Limpiar caracteres prohibidos en Windows
      saveName = this._cleanFilename(saveName);

      // Si aún no tenemos año y mes, usar la fecha actual
      if (!year || !month) {
        const now = new Date();
        year = String(now.getFullYear());
        const monthPad = String(now.getMonth() + 1).padStart(2, '0');
        month = MONTH_NAMES[monthPad] || `Mes_${monthPad}`;
      }

      const baseDir = this.activeFolder || path.join(app.getPath('documents'), 'SRI_Clientes');
      let targetDir = baseDir;

      // Clasificar por categoría (Ventas / Compras)
      if (this.currentCategory) {
        targetDir = path.join(targetDir, this.currentCategory);
      }

      // Clasificar por Año y Mes
      targetDir = path.join(targetDir, year, month);

      // Asegurar que la carpeta exista
      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
      } catch (err) {
        console.error('Error asegurando carpeta de mes:', err);
      }

      // Ruta final del archivo
      let fullPath = path.join(targetDir, saveName);

      // Si ya existiera un archivo idéntico, añadir número para evitar sobreescritura accidental
      if (fs.existsSync(fullPath)) {
        const nameWithoutExt = path.basename(saveName, '.xml');
        saveName = `${nameWithoutExt}_duplicado.xml`;
        fullPath = path.join(targetDir, saveName);
      }

      item.setSavePath(fullPath);
      this.stats.activeDownloads++;
      this._notifyStats();

      // Limpiar expectedInfo para el siguiente comprobante
      this.expectedInfo = null;

      this._emitToRenderer('download-started', {
        filename: saveName,
        path: fullPath
      });

      item.once('done', (doneEvent, state) => {
        this.stats.activeDownloads = Math.max(0, this.stats.activeDownloads - 1);
        if (state === 'completed') {
          this.stats.completed++;
          this.stats.xmlCount++;
          this._emitToRenderer('download-completed', {
            filename: saveName,
            fullPath: fullPath,
            stats: this.stats
          });
        } else {
          this.stats.failed++;
          this._emitToRenderer('download-failed', {
            filename: saveName,
            state: state,
            stats: this.stats
          });
        }
        this._notifyStats();
      });
    });
  }

  _notifyStats() {
    this._emitToRenderer('download-stats-update', this.stats);
  }

  _emitToRenderer(channel, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload);
    }
  }
}

module.exports = DownloadManager;
