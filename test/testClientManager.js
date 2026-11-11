const { app } = require('electron');
const ClientManager = require('../src/main/clientManager');

app.whenReady().then(async () => {
  try {
    const cm = new ClientManager();
    console.log('ClientManager iniciado');

    const testClient = {
      ruc: '1790012345001',
      razonSocial: 'Prueba Empresa S.A.',
      password: 'MiClaveSegura123',
      notes: 'Cliente de prueba'
    };

    const saved = await cm.save(testClient);
    console.log('Cliente guardado:', saved.ruc, saved.razonSocial);

    const creds = await cm.getCredentials('1790012345001');
    console.log('Credenciales recuperadas. Clave coincide:', creds.password === 'MiClaveSegura123');

    const all = cm.getAll();
    console.log('Total clientes en storage:', all.length);

    // Limpiar prueba
    cm.delete('1790012345001');
    console.log('Cliente de prueba eliminado');

    console.log('¡Prueba de ClientManager exitosa!');
    app.quit();
  } catch (err) {
    console.error('Error en prueba:', err);
    app.exit(1);
  }
});
