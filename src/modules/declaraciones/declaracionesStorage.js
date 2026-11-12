/**
 * Almacenamiento Seguro de Declaraciones y Saldos Históricos - SRI Ecuador
 * TRIBU - Asistente Contable
 * 
 * Regla de estilo: Cero emojis en código, comentarios y salidas.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class DeclaracionesStorage {
  constructor() {
    this.userDataDir = this._resolveUserDataDir();
    this.storageFile = path.join(this.userDataDir, 'tribu_declaraciones.json');
    this.declaraciones = this._loadStorage();
  }

  _resolveUserDataDir() {
    if (app && typeof app.getPath === 'function') {
      try {
        return app.getPath('userData');
      } catch (e) {
        // Fallback
      }
    }
    const home = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : process.env.HOME);
    return path.join(home, 'tribu-sri');
  }

  _loadStorage() {
    try {
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true });
      }
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error cargando storage de declaraciones:', e);
    }
    return {};
  }

  _saveStorage() {
    try {
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true });
      }
      fs.writeFileSync(this.storageFile, JSON.stringify(this.declaraciones, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('Error guardando storage de declaraciones:', e);
      return false;
    }
  }

  _getKey(clientRuc, year, month) {
    const cleanMonth = String(month).match(/\d{1,2}/);
    const m = cleanMonth ? cleanMonth[0].padStart(2, '0') : String(month);
    return `${clientRuc}_${year}_${m}`;
  }

  getDeclaracion(clientRuc, year, month) {
    const key = this._getKey(clientRuc, year, month);
    return this.declaraciones[key] || null;
  }

  saveDeclaracion(clientRuc, year, month, data) {
    const key = this._getKey(clientRuc, year, month);
    this.declaraciones[key] = {
      ...this.declaraciones[key],
      ...data,
      clientRuc,
      year: String(year),
      month: String(month),
      updatedAt: new Date().toISOString()
    };
    return this._saveStorage();
  }

  /**
   * Obtiene los saldos de crédito tributario arrastrables del mes inmediatamente anterior
   */
  getPreviousMonthBalances(clientRuc, currentYear, currentMonth) {
    const cleanMonth = String(currentMonth).match(/\d{1,2}/);
    let m = cleanMonth ? parseInt(cleanMonth[0], 10) : 1;
    let y = parseInt(currentYear, 10);

    if (m === 1) {
      m = 12;
      y = y - 1;
    } else {
      m = m - 1;
    }

    const prevMonthStr = String(m).padStart(2, '0');
    const key = `${clientRuc}_${y}_${prevMonthStr}`;
    const prevRecord = this.declaraciones[key];

    if (prevRecord && prevRecord.casilleros) {
      return {
        hasPreviousRecord: true,
        previousYear: String(y),
        previousMonth: prevMonthStr,
        c615: parseFloat(prevRecord.casilleros.c615) || 0.0,
        c617: parseFloat(prevRecord.casilleros.c617) || 0.0
      };
    }

    return {
      hasPreviousRecord: false,
      previousYear: String(y),
      previousMonth: prevMonthStr,
      c615: 0.0,
      c617: 0.0
    };
  }
}

module.exports = new DeclaracionesStorage();
