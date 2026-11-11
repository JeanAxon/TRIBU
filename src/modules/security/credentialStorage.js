const crypto = require('crypto');
const { safeStorage } = require('electron');

class CredentialStorage {
  constructor() {
    this.fallbackKey = this._generateMachineKey();
  }

  /**
   * Genera una clave criptográfica vinculada a la máquina y usuario de Windows
   */
  _generateMachineKey() {
    const machineId = (process.env.COMPUTERNAME || 'tribu_app') + 
                      (process.env.USERNAME || 'accountant') + 
                      (process.env.USERDOMAIN || 'local');
    return crypto.createHash('sha256').update(machineId).digest();
  }

  /**
   * Cifra una contraseña usando Windows DPAPI (safeStorage) con fallback a AES-256
   */
  async encryptPassword(plainText) {
    if (!plainText) return '';

    // 1. Intentar safeStorage (DPAPI de Windows)
    try {
      if (typeof safeStorage.isAsyncEncryptionAvailable === 'function') {
        const isAvail = await safeStorage.isAsyncEncryptionAvailable();
        if (isAvail) {
          const buffer = await safeStorage.encryptStringAsync(plainText);
          const buf = Buffer.isBuffer(buffer) ? buffer : (buffer.result || buffer);
          return 'safe:' + buf.toString('base64');
        }
      } else if (typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
        const buffer = safeStorage.encryptString(plainText);
        return 'safe:' + buffer.toString('base64');
      }
    } catch (e) {
      console.warn('safeStorage no disponible en este entorno, usando fallback criptográfico:', e.message);
    }

    // 2. Fallback con AES-256-CBC con clave derivada de la máquina
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', this.fallbackKey, iv);
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return 'fallback:' + iv.toString('hex') + ':' + encrypted;
    } catch (err) {
      console.error('Error en fallback de cifrado:', err);
      return '';
    }
  }

  /**
   * Descifra una contraseña recuperando exactamente el texto plano
   */
  async decryptPassword(encryptedText) {
    if (!encryptedText) return '';

    try {
      // 1. Formato safeStorage
      if (encryptedText.startsWith('safe:')) {
        const base64Data = encryptedText.substring(5);
        const buffer = Buffer.from(base64Data, 'base64');

        if (typeof safeStorage.decryptStringAsync === 'function') {
          const res = await safeStorage.decryptStringAsync(buffer);
          if (res && typeof res === 'object' && 'result' in res) {
            return res.result;
          }
          return typeof res === 'string' ? res : '';
        } else if (typeof safeStorage.decryptString === 'function') {
          return safeStorage.decryptString(buffer);
        }
      } 
      // 2. Formato fallback AES
      else if (encryptedText.startsWith('fallback:')) {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[1], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.fallbackKey, iv);
        let decrypted = decipher.update(parts[2], 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
      // 3. Fallback texto plano (si existiera migración antigua)
      else {
        return encryptedText;
      }
    } catch (e) {
      console.error('Error al descifrar contraseña:', e.message);
      return '';
    }

    return '';
  }
}

module.exports = new CredentialStorage();
