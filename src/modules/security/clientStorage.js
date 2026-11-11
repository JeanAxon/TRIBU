const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const credentialStorage = require('./credentialStorage');

class ClientStorage {
  constructor() {
    this.userDataDir = this._resolveUserDataDir();
    this.storageFile = path.join(this.userDataDir, 'tribu_clients.json');
    this.configFile = path.join(this.userDataDir, 'tribu_config.json');
    this._ensureDirectories();
    this._migrateLegacyStorageIfNeeded();
    
    if (app && typeof app.isReady === 'function') {
      if (app.isReady()) {
        this.syncAllClientFolderSessions().catch(() => {});
      } else if (typeof app.whenReady === 'function') {
        app.whenReady().then(() => {
          this.syncAllClientFolderSessions().catch(() => {});
        });
      }
    }
  }

  /**
   * Resuelve la ruta definitiva de userData para tribu-sri
   */
  _resolveUserDataDir() {
    try {
      const appData = app.getPath('appData');
      return path.join(appData, 'tribu-sri');
    } catch (e) {
      return path.join(process.env.APPDATA || process.cwd(), 'tribu-sri');
    }
  }

  /**
   * Asegura que exista el directorio de datos
   */
  _ensureDirectories() {
    try {
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true });
      }
    } catch (err) {
      console.error('Error creando directorio userData:', err.message);
    }
  }

  /**
   * Si existían clientes guardados en AppData/Roaming/Electron, los migra automáticamente
   */
  _migrateLegacyStorageIfNeeded() {
    try {
      const appData = app.getPath('appData');
      const legacyFile = path.join(appData, 'Electron', 'tribu_clients.json');
      if (fs.existsSync(legacyFile)) {
        const rawLegacy = fs.readFileSync(legacyFile, 'utf8');
        const legacyClients = JSON.parse(rawLegacy);
        if (Array.isArray(legacyClients) && legacyClients.length > 0) {
          const currentClients = this._readStorage();
          let merged = false;
          for (const leg of legacyClients) {
            const exists = currentClients.some(c => c.ruc === leg.ruc || c.id === leg.id);
            if (!exists) {
              currentClients.push(leg);
              merged = true;
            }
          }
          if (merged) {
            this._writeStorage(currentClients);
          }
        }
      }
    } catch (e) {
      // Ignorar fallas de migración silenciosamente
    }
  }

  sanitizeFolderName(name) {
    if (!name) return 'Cliente_SRI';
    let sanitized = name.replace(/[<>:"/\\|?*]/g, '').trim();
    sanitized = sanitized.replace(/[.\s]+$/, '').trim();
    return sanitized || 'Cliente_SRI';
  }

  normalizeText(text) {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[<>:"/\\|?*.,;_\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _levenshtein(s1, s2) {
    if (s1 === s2) return 0;
    if (!s1.length) return s2.length;
    if (!s2.length) return s1.length;

    const track = Array(s2.length + 1).fill(null).map(() =>
      Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }
    return track[s2.length][s1.length];
  }

  calculateSimilarity(str1, str2) {
    const s1 = this.normalizeText(str1);
    const s2 = this.normalizeText(str2);

    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0.0;

    // Coincidencia exacta de palabras en cualquier orden (ej: Nombres Apellidos vs Apellidos Nombres)
    const tokens1 = s1.split(' ').filter(Boolean).sort().join(' ');
    const tokens2 = s2.split(' ').filter(Boolean).sort().join(' ');
    if (tokens1 === tokens2) return 0.98;

    // Distancia global Levenshtein para errores tipográficos
    const globalDist = this._levenshtein(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    const globalScore = 1 - (globalDist / maxLen);

    // Comparación palabra por palabra (para detectar nombres parecidos con apellidos y nombres adicionales)
    const words1 = s1.split(' ').filter(w => w.length > 1);
    const words2 = s2.split(' ').filter(w => w.length > 1);

    let combinedWordScore = 0;
    if (words1.length > 0 && words2.length > 0) {
      let matchedScoreSum = 0;
      for (const w1 of words1) {
        let bestWordSim = 0;
        for (const w2 of words2) {
          if (w1 === w2) {
            bestWordSim = 1.0;
            break;
          }
          const wDist = this._levenshtein(w1, w2);
          const wMax = Math.max(w1.length, w2.length);
          const wSim = 1 - (wDist / wMax);
          if (wSim > bestWordSim) bestWordSim = wSim;
        }
        matchedScoreSum += bestWordSim;
      }
      const wordCoverage = matchedScoreSum / Math.max(words1.length, words2.length);
      const minCoverage = matchedScoreSum / Math.min(words1.length, words2.length);
      combinedWordScore = (wordCoverage * 0.4) + (minCoverage * 0.6);
    }

    // Coeficiente de intersección de palabras (Jaccard)
    const set1 = new Set(s1.split(' ').filter(Boolean));
    const set2 = new Set(s2.split(' ').filter(Boolean));
    let intersection = 0;
    for (const word of set1) {
      if (set2.has(word)) intersection++;
    }
    const union = new Set([...set1, ...set2]).size;
    const jaccard = union > 0 ? intersection / union : 0;

    return Math.max(globalScore, combinedWordScore, jaccard);
  }

  /**
   * Busca clientes existentes con nombre idéntico, parecido o mismo RUC
   */
  findDuplicateOrSimilar(clientData, excludeId = null) {
    if (!clientData) return null;
    const clients = this._readStorage();
    const candidateName = (clientData.apellidos || clientData.nombres)
      ? `${clientData.apellidos || ''} ${clientData.nombres || ''}`.trim()
      : (clientData.razonSocial || '').trim();
    const candidateRuc = (clientData.ruc || '').trim();

    const matches = [];

    for (const c of clients) {
      if (excludeId && (c.id === excludeId || c.ruc === excludeId)) {
        continue;
      }

      const existingName = (c.apellidos || c.nombres)
        ? `${c.apellidos || ''} ${c.nombres || ''}`.trim()
        : (c.razonSocial || '').trim();
      const existingRuc = (c.ruc || '').trim();

      const isSameRuc = Boolean(candidateRuc && existingRuc === candidateRuc);
      const similarity = this.calculateSimilarity(candidateName, existingName);

      // Si la similitud es alta (>= 78%) o coincide el RUC
      if (similarity >= 0.78 || isSameRuc) {
        let matchReason = 'Nombre similar';
        if (similarity === 1.0) matchReason = 'Nombre idéntico';
        else if (similarity >= 0.95) matchReason = 'Nombre casi idéntico (posible tipeo)';
        else if (isSameRuc) matchReason = 'Mismo RUC registrado';

        matches.push({
          existingClient: c,
          existingName,
          existingRuc,
          existingFolder: c.defaultFolder,
          candidateName,
          candidateRuc,
          similarity: parseFloat(similarity.toFixed(2)),
          matchReason,
          isExact: similarity === 1.0,
          isSameRuc
        });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.length > 0 ? matches[0] : null;
  }

  getBaseFolder() {
    try {
      if (fs.existsSync(this.configFile)) {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        if (config.baseFolder) return config.baseFolder;
      }
    } catch (e) {
      console.warn('Error leyendo config:', e.message);
    }

    const defaultBase = path.join(app.getPath('documents'), 'SRI_Clientes');
    try {
      if (!fs.existsSync(defaultBase)) {
        fs.mkdirSync(defaultBase, { recursive: true });
      }
    } catch (e) {}
    return defaultBase;
  }

  setBaseFolder(newBaseFolder) {
    if (!newBaseFolder) return false;
    try {
      if (!fs.existsSync(newBaseFolder)) {
        fs.mkdirSync(newBaseFolder, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify({ baseFolder: newBaseFolder }, null, 2), 'utf8');

      const clients = this._readStorage();
      clients.forEach(c => {
        c.defaultFolder = path.join(newBaseFolder, this.sanitizeFolderName(c.razonSocial));
        try {
          if (!fs.existsSync(c.defaultFolder)) {
            fs.mkdirSync(c.defaultFolder, { recursive: true });
          }
        } catch (e) {}
      });
      this._writeStorage(clients);
      return true;
    } catch (err) {
      console.error('Error guardando carpeta base:', err);
      return false;
    }
  }

  _readStorage() {
    try {
      if (!fs.existsSync(this.storageFile)) {
        return [];
      }
      const raw = fs.readFileSync(this.storageFile, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error leyendo clientes:', err);
      return [];
    }
  }

  _writeStorage(data) {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error guardando clientes:', err);
      return false;
    }
  }

  getAll() {
    const clients = this._readStorage();
    const baseFolder = this.getBaseFolder();

    return clients.map(c => {
      const clientFolder = c.defaultFolder || path.join(baseFolder, this.sanitizeFolderName(c.razonSocial));
      return {
        id: c.id,
        ruc: c.ruc,
        razonSocial: c.razonSocial,
        apellidos: c.apellidos || '',
        nombres: c.nombres || '',
        tipoContribuyente: c.tipoContribuyente || 'natural',
        hasPassword: Boolean(c.passwordEncrypted),
        defaultFolder: clientFolder,
        organizeByFolder: true,
        lastLogin: c.lastLogin || null,
        createdAt: c.createdAt || new Date().toISOString()
      };
    });
  }

  getById(id) {
    const clients = this._readStorage();
    return clients.find(c => c.id === id || c.ruc === id) || null;
  }

  async save(clientData, options = {}) {
    const clients = this._readStorage();
    let id = clientData.id || clientData.ruc;
    let existingIndex = -1;

    // Si se especificó actualizar un cliente existente previo (ej: corrección de nombre)
    if (options.overwriteExistingId) {
      existingIndex = clients.findIndex(c => c.id === options.overwriteExistingId || c.ruc === options.overwriteExistingId);
      if (existingIndex >= 0) {
        id = clients[existingIndex].id;
      }
    } else {
      existingIndex = clients.findIndex(c => c.id === id || c.ruc === clientData.ruc);
    }

    let passwordEncrypted = undefined;
    if (clientData.password) {
      passwordEncrypted = await credentialStorage.encryptPassword(clientData.password);
    }

    const apellidos = clientData.apellidos ? clientData.apellidos.trim() : '';
    const nombres = clientData.nombres ? clientData.nombres.trim() : '';
    let razonSocialClean = '';

    if (apellidos || nombres) {
      razonSocialClean = `${apellidos} ${nombres}`.trim();
    } else if (clientData.razonSocial) {
      razonSocialClean = clientData.razonSocial.trim();
    } else {
      razonSocialClean = `Contribuyente ${clientData.ruc}`;
    }

    // Si el cliente viene con diferenciador explícito (ej: homónimo confirmado)
    if (clientData.diferenciador && !razonSocialClean.includes(clientData.diferenciador)) {
      razonSocialClean = `${razonSocialClean} ${clientData.diferenciador}`.trim();
    }

    const baseFolder = this.getBaseFolder();
    let folderName = this.sanitizeFolderName(razonSocialClean);
    let defaultFolder = path.join(baseFolder, folderName);

    // Si es un cliente nuevo y la carpeta en disco ya existe (o colisiona con otro cliente):
    // Colocar automáticamente un elemento diferenciador para que tenga su propia carpeta
    if (existingIndex < 0 && fs.existsSync(defaultFolder)) {
      const diffSuffix = ` (${clientData.ruc.trim()})`;
      if (!razonSocialClean.includes(diffSuffix)) {
        razonSocialClean = `${razonSocialClean}${diffSuffix}`;
        folderName = this.sanitizeFolderName(razonSocialClean);
        defaultFolder = path.join(baseFolder, folderName);
      }
      let counter = 2;
      while (fs.existsSync(defaultFolder)) {
        const baseWithoutSeq = razonSocialClean.replace(/\s*\(\d+\)$/, '');
        razonSocialClean = `${baseWithoutSeq} (${counter})`;
        folderName = this.sanitizeFolderName(razonSocialClean);
        defaultFolder = path.join(baseFolder, folderName);
        counter++;
      }
    }

    // Si el cliente ya existía y cambió de nombre/carpeta, renombrar la carpeta en disco
    if (existingIndex >= 0 && clients[existingIndex].defaultFolder) {
      const oldFolder = clients[existingIndex].defaultFolder;
      if (oldFolder !== defaultFolder && fs.existsSync(oldFolder) && !fs.existsSync(defaultFolder)) {
        try {
          fs.renameSync(oldFolder, defaultFolder);
        } catch (renameErr) {
          console.warn('No se pudo renombrar carpeta antigua del cliente:', renameErr.message);
        }
      }
    }

    try {
      if (!fs.existsSync(defaultFolder)) {
        fs.mkdirSync(defaultFolder, { recursive: true });
      }
    } catch (e) {
      console.warn('No se pudo pre-crear la carpeta:', defaultFolder, e.message);
    }

    const record = {
      id: id,
      ruc: clientData.ruc.trim(),
      razonSocial: razonSocialClean,
      apellidos: apellidos,
      nombres: nombres,
      tipoContribuyente: clientData.tipoContribuyente || (apellidos || nombres ? 'natural' : 'juridica'),
      defaultFolder: defaultFolder,
      organizeByFolder: true,
      lastLogin: clientData.lastLogin || (existingIndex >= 0 ? clients[existingIndex].lastLogin : null),
      createdAt: existingIndex >= 0 ? clients[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (passwordEncrypted !== undefined) {
      record.passwordEncrypted = passwordEncrypted;
    } else if (existingIndex >= 0) {
      record.passwordEncrypted = clients[existingIndex].passwordEncrypted;
    }

    if (existingIndex >= 0) {
      clients[existingIndex] = { ...clients[existingIndex], ...record };
    } else {
      clients.push(record);
    }

    this._writeStorage(clients);

    // Guardar los datos de inicio de sesión de cada usuario en su respectiva carpeta con un método de seguridad
    await this._saveSessionInClientFolder(record, clientData.password);

    return this.getById(id);
  }

  /**
   * Guarda de forma segura los datos de inicio de sesión del usuario en su respectiva carpeta
   * Utiliza el método de seguridad safeStorage/DPAPI con fallback AES-256
   */
  async _saveSessionInClientFolder(clientRecord, plainPassword = null) {
    if (!clientRecord || !clientRecord.defaultFolder) return false;

    try {
      if (!fs.existsSync(clientRecord.defaultFolder)) {
        fs.mkdirSync(clientRecord.defaultFolder, { recursive: true });
      }

      let pwd = plainPassword;
      if (!pwd && clientRecord.passwordEncrypted) {
        pwd = await credentialStorage.decryptPassword(clientRecord.passwordEncrypted);
      }

      const sessionPayload = {
        app: 'TRIBU',
        version: '1.0',
        ruc: clientRecord.ruc,
        razonSocial: clientRecord.razonSocial,
        apellidos: clientRecord.apellidos || '',
        nombres: clientRecord.nombres || '',
        tipoContribuyente: clientRecord.tipoContribuyente || 'natural',
        password: pwd || '',
        passwordEncrypted: clientRecord.passwordEncrypted || '',
        defaultFolder: clientRecord.defaultFolder,
        updatedAt: clientRecord.updatedAt || new Date().toISOString()
      };

      const encryptedSession = await credentialStorage.encryptPassword(JSON.stringify(sessionPayload, null, 2));
      const sessionFilePath = path.join(clientRecord.defaultFolder, 'tribu_session.enc');
      fs.writeFileSync(sessionFilePath, encryptedSession, 'utf8');

      return true;
    } catch (err) {
      console.error('Error guardando datos de inicio de sesión en carpeta del cliente:', err);
      return false;
    }
  }

  /**
   * Sincroniza y asegura que las carpetas existentes de los clientes contengan su archivo de sesión cifrado
   */
  async syncAllClientFolderSessions() {
    try {
      const clients = this._readStorage();
      for (const c of clients) {
        if (c.defaultFolder && fs.existsSync(c.defaultFolder)) {
          const sessionFile = path.join(c.defaultFolder, 'tribu_session.enc');
          if (!fs.existsSync(sessionFile) && c.passwordEncrypted) {
            await this._saveSessionInClientFolder(c);
          }
        }
      }
    } catch (e) {
      console.warn('Error sincronizando sesiones en carpetas de clientes:', e.message);
    }
  }

  delete(id) {
    let clients = this._readStorage();
    clients = clients.filter(c => c.id !== id && c.ruc !== id);
    return this._writeStorage(clients);
  }

  async getCredentials(id) {
    const client = this.getById(id);
    if (!client) return null;

    let password = '';
    if (client.passwordEncrypted) {
      password = await credentialStorage.decryptPassword(client.passwordEncrypted);
    }

    // Fallback/Respaldo desde la carpeta del cliente
    if (!password && client.defaultFolder) {
      try {
        const sessionFilePath = path.join(client.defaultFolder, 'tribu_session.enc');
        if (fs.existsSync(sessionFilePath)) {
          const rawEnc = fs.readFileSync(sessionFilePath, 'utf8');
          const decryptedJson = await credentialStorage.decryptPassword(rawEnc);
          if (decryptedJson) {
            const parsed = JSON.parse(decryptedJson);
            if (parsed && parsed.password) {
              password = parsed.password;
              if (!client.passwordEncrypted && parsed.passwordEncrypted) {
                client.passwordEncrypted = parsed.passwordEncrypted;
                const clients = this._readStorage();
                const idx = clients.findIndex(c => c.id === client.id || c.ruc === client.ruc);
                if (idx >= 0) {
                  clients[idx].passwordEncrypted = parsed.passwordEncrypted;
                  this._writeStorage(clients);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error leyendo sesión cifrada en carpeta del cliente:', err.message);
      }
    }

    return {
      ruc: client.ruc,
      password: password
    };
  }

  updateLastLogin(id) {
    const clients = this._readStorage();
    const client = clients.find(c => c.id === id || c.ruc === id);
    if (client) {
      client.lastLogin = new Date().toISOString();
      this._writeStorage(clients);
    }
  }
}

module.exports = new ClientStorage();
