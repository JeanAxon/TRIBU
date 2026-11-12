const { app } = require('electron');
const path = require('path');
const security = require('../src/modules/security');

app.setName('tribu-sri');

app.whenReady().then(async () => {
  try {
    console.log('--- Iniciando prueba del Modulo de Seguridad ---');

    // 1. Cifrado y Descifrado con caracteres complejos (comillas, puntos, etc.)
    const complexPasswords = [
      'Mari2000".',
      'pruiz219096.xyz',
      'Cl@ve"Con\'Comillas#123!',
      'Clave con espacios y acentos: áéíóú 2026'
    ];

    for (const pwd of complexPasswords) {
      const encrypted = await security.credentialStorage.encryptPassword(pwd);
      const decrypted = await security.credentialStorage.decryptPassword(encrypted);
      if (decrypted !== pwd) {
        throw new Error(`Fallo en descifrado para: ${pwd} (obtenido: ${decrypted})`);
      }
    }
    console.log('1. Cifrado y descifrado de contrasenas complejas: CORRECTO');

    // 2. Comprobar que clientStorage usa la ruta esperada
    const storagePath = security.clientStorage.storageFile;
    console.log('2. Ruta de almacenamiento seguro:', storagePath);
    if (!storagePath.toLowerCase().includes('tribu-sri')) {
      throw new Error(`Ruta de almacenamiento no apunta a tribu-sri: ${storagePath}`);
    }

    // 3. Comprobar clientes existentes
    const existing = security.clientStorage.getAll();
    console.log('3. Clientes existentes detectados:', existing.length);
    existing.forEach(c => {
      console.log(`   - [${c.ruc}] ${c.razonSocial} (Tiene clave: ${c.hasPassword})`);
    });

    // 4. Guardar cliente de prueba con formato estandarizado de Apellidos y Nombres
    const testRuc = '9999999999001';
    const testPassword = 'TestSecure"Pass.2026';
    let savedClient = null;

    try {
      savedClient = await security.clientStorage.save({
        ruc: testRuc,
        tipoContribuyente: 'natural',
        apellidos: 'PEREZ LOPEZ',
        nombres: 'JUAN CARLOS',
        password: testPassword
      });

      if (savedClient.razonSocial !== 'PEREZ LOPEZ JUAN CARLOS') {
        throw new Error(`Razón social no estandarizada: ${savedClient.razonSocial}`);
      }

      const creds = await security.clientStorage.getCredentials(testRuc);
      if (!creds || creds.password !== testPassword) {
        throw new Error(`Credenciales no coinciden. Esperado: ${testPassword}, Obtenido: ${creds ? creds.password : null}`);
      }

      // Comprobar que tribu_session.enc se haya creado en la carpeta del cliente y esté cifrado
      const sessionFilePath = path.join(savedClient.defaultFolder, 'tribu_session.enc');
      const fs = require('fs');
      if (!fs.existsSync(sessionFilePath)) {
        throw new Error(`El archivo de sesión cifrada no existe en: ${sessionFilePath}`);
      }
      const sessionEncContent = fs.readFileSync(sessionFilePath, 'utf8');
      if (!sessionEncContent.startsWith('safe:') && !sessionEncContent.startsWith('fallback:')) {
        throw new Error('El archivo tribu_session.enc no tiene formato cifrado');
      }
      console.log('4. Guardado y recuperacion de credenciales seguras (incluyendo tribu_session.enc en su carpeta): CORRECTO');
    } finally {
      // 5. Eliminar cliente de prueba para no ensuciar datos
      try {
        security.clientStorage.delete(testRuc);
      } catch (e) {}

      const fs = require('fs');
      if (savedClient && savedClient.defaultFolder && fs.existsSync(savedClient.defaultFolder)) {
        try {
          fs.rmSync(savedClient.defaultFolder, { recursive: true, force: true });
        } catch (e) {}
      }
    }

    const postDelete = security.clientStorage.getById(testRuc);
    if (postDelete) {
      throw new Error('El cliente de prueba no fue eliminado');
    }
    console.log('5. Limpieza de cliente de prueba: CORRECTO');

    console.log('--- Todas las pruebas del Modulo de Seguridad completadas con exito ---');
    app.quit();
  } catch (err) {
    console.error('Error en prueba del Modulo de Seguridad:', err);
    app.exit(1);
  }
});
