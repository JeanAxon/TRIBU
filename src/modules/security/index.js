/**
 * Módulo de Seguridad y Gestión de Credenciales - TRIBU
 * Encargado de la persistencia aislada, cifrado DPAPI y autenticación de contribuyentes.
 */

const clientStorage = require('./clientStorage');
const credentialStorage = require('./credentialStorage');

function registerIpc(ipcMain) {
  ipcMain.handle('client:get-all', async () => {
    return clientStorage.getAll();
  });

  ipcMain.handle('client:save', async (event, clientData, options) => {
    return clientStorage.save(clientData, options);
  });

  ipcMain.handle('client:check-duplicate', async (event, { clientData, excludeId }) => {
    return clientStorage.findDuplicateOrSimilar(clientData, excludeId);
  });

  ipcMain.handle('client:delete', async (event, id) => {
    return clientStorage.delete(id);
  });

  ipcMain.handle('client:get-credentials', async (event, id) => {
    return clientStorage.getCredentials(id);
  });

  ipcMain.handle('client:update-last-login', async (event, id) => {
    return clientStorage.updateLastLogin(id);
  });

  ipcMain.handle('client:get-base-folder', async () => {
    return clientStorage.getBaseFolder();
  });

  ipcMain.handle('client:set-base-folder', async (event, newBaseFolder) => {
    return clientStorage.setBaseFolder(newBaseFolder);
  });
}

module.exports = {
  clientStorage,
  credentialStorage,
  registerIpc
};
