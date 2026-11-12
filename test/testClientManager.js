const { app } = require('electron');
const fs = require('fs');
const ClientManager = require('../src/main/clientManager');

app.whenReady().then(async () => {
  const cm = new ClientManager();
  console.log('ClientManager iniciado');

  const testClient = {
    ruc: '1790012345001',
    razonSocial: 'Prueba Empresa S.A.',
    password: 'MiClaveSegura123',
    notes: 'Cliente de prueba'
  };

  let savedFolder = null;

  try {
    const saved = await cm.save(testClient);
    savedFolder = saved ? saved.defaultFolder : null;
    console.log('Cliente guardado:', saved.ruc, saved.razonSocial);

    const creds = await cm.getCredentials('1790012345001');
    console.log('Credenciales recuperadas. Clave coincide:', creds.password === 'MiClaveSegura123');

    const all = cm.getAll();
    console.log('Total clientes en storage:', all.length);

    console.log('¡Prueba de ClientManager exitosa!');
  } catch (err) {
    console.error('Error en prueba:', err);
    app.exit(1);
    return;
  } finally {
    // Limpiar prueba en storage y en disco garantizado
    try {
      cm.delete('1790012345001');
      console.log('Cliente de prueba eliminado de storage');
    } catch (e) {}

    if (savedFolder && fs.existsSync(savedFolder)) {
      try {
        fs.rmSync(savedFolder, { recursive: true, force: true });
        console.log('Carpeta temporal de prueba eliminada de disco:', savedFolder);
      } catch (e) {}
    }
  }

  app.quit();
});
