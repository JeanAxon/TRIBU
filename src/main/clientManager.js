/**
 * ClientManager - Adaptador de compatibilidad hacia src/modules/security
 */
const clientStorage = require('../modules/security/clientStorage');

class ClientManager {
  constructor() {
    this.storage = clientStorage;
  }

  sanitizeFolderName(name) {
    return this.storage.sanitizeFolderName(name);
  }

  getBaseFolder() {
    return this.storage.getBaseFolder();
  }

  setBaseFolder(newBaseFolder) {
    return this.storage.setBaseFolder(newBaseFolder);
  }

  getAll() {
    return this.storage.getAll();
  }

  getById(id) {
    return this.storage.getById(id);
  }

  async save(clientData) {
    return this.storage.save(clientData);
  }

  delete(id) {
    return this.storage.delete(id);
  }

  async getCredentials(id) {
    return this.storage.getCredentials(id);
  }

  updateLastLogin(id) {
    return this.storage.updateLastLogin(id);
  }
}

module.exports = ClientManager;
