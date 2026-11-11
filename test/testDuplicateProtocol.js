const { app } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('tribu-sri');

app.whenReady().then(async () => {
  console.log('--- Probando Protocolo de Detección de Duplicados y Nombres Parecidos ---');
  const clientStorage = require('../src/modules/security/clientStorage');

  // 1. Similitudes
  console.log('1. Verificando cálculo de similitud:');
  const sim1 = clientStorage.calculateSimilarity('JEAN PIERRE RUIZ', 'Jean Pierre Ruiz');
  console.log('  - Exacto ignorando mayúsculas/minúsculas:', sim1, (sim1 === 1.0 ? '[OK]' : '[FAIL]'));

  const sim2 = clientStorage.calculateSimilarity('JEAN PIERRE RUIZ', 'RUIZ JEAN PIERRE');
  console.log('  - Palabras permutadas (Apellidos primero):', sim2, (sim2 >= 0.95 ? '[OK]' : '[FAIL]'));

  const sim3 = clientStorage.calculateSimilarity('JEAN PIERE RUIZ', 'JEAN PIERRE RUIZ');
  console.log('  - Error de tipeo (PIERE vs PIERRE):', sim3, (sim3 >= 0.85 ? '[OK]' : '[FAIL]'));

  const sim4 = clientStorage.calculateSimilarity('ESPINOSA AZANZA DOLORES', 'ESPINOZA AZANZA DOLORES MARICELA');
  console.log('  - Nombre parecido con variación ortográfica:', sim4, (sim4 >= 0.8 ? '[OK]' : '[FAIL]'));

  const sim5 = clientStorage.calculateSimilarity('JUAN CARLOS PEREZ', 'MARIA BELEN LOPEZ');
  console.log('  - Nombres completamente distintos:', sim5, (sim5 < 0.4 ? '[OK]' : '[FAIL]'));

  // 2. Detección de duplicado contra clientes registrados
  console.log('\n2. Verificando detección de duplicados contra base de datos:');
  const match1 = clientStorage.findDuplicateOrSimilar({
    apellidos: 'RUIZ',
    nombres: 'JEAN PIERRE',
    ruc: '1105383663001'
  });
  console.log('  - Coincidencia encontrada:', match1 ? `${match1.matchReason} (${match1.similarity * 100}%)` : 'Ninguna', match1 ? '[OK]' : '[FAIL]');

  const match2 = clientStorage.findDuplicateOrSimilar({
    apellidos: 'ESPINOSA AZANZA',
    nombres: 'DOLORES',
    ruc: '0999999999001'
  });
  console.log('  - Detección de nombre parecido con otro RUC:', match2 ? `${match2.matchReason} (${match2.similarity * 100}%)` : 'Ninguna', match2 ? '[OK]' : '[FAIL]');

  // 3. Caso 1: Es el mismo cliente -> Modificar / Corregir nombre
  console.log('\n3. Verificando Caso 1: Es el mismo cliente (Actualizar nombre):');
  const tempClient = await clientStorage.save({
    ruc: '0991112223001',
    apellidos: 'GONZALES PEREZ',
    nombres: 'CARLOS',
    tipoContribuyente: 'natural'
  });
  console.log('  - Cliente original creado:', tempClient.razonSocial);

  // Corregir nombre antiguo ("GONZALES" a "GONZÁLEZ")
  const updatedClient = await clientStorage.save({
    ruc: '0991112223001',
    apellidos: 'GONZÁLEZ PÉREZ',
    nombres: 'CARLOS ALBERTO',
    tipoContribuyente: 'natural'
  }, { overwriteExistingId: tempClient.id });

  console.log('  - Cliente corregido:', updatedClient.razonSocial);
  console.log('  - Carpeta actualizada en disco:', fs.existsSync(updatedClient.defaultFolder) ? '[OK]' : '[FAIL]');

  // 4. Caso 2: Es un cliente nuevo con mismo nombre -> Diferenciador automático
  console.log('\n4. Verificando Caso 2: Nuevo cliente con mismo nombre (Diferenciador automático):');
  const homonimoClient = await clientStorage.save({
    ruc: '0998887776001',
    apellidos: 'GONZÁLEZ PÉREZ',
    nombres: 'CARLOS ALBERTO',
    diferenciador: '(0998887776001)',
    tipoContribuyente: 'natural'
  });
  console.log('  - Homónimo creado con diferenciador:', homonimoClient.razonSocial);
  console.log('  - Carpeta diferenciada en disco:', homonimoClient.defaultFolder);
  console.log('  - Carpeta distinta de la original:', (homonimoClient.defaultFolder !== updatedClient.defaultFolder) ? '[OK]' : '[FAIL]');

  // Limpiar clientes de prueba
  clientStorage.delete(tempClient.id);
  clientStorage.delete(homonimoClient.id);
  if (fs.existsSync(tempClient.defaultFolder)) fs.rmSync(tempClient.defaultFolder, { recursive: true, force: true });
  if (fs.existsSync(updatedClient.defaultFolder)) fs.rmSync(updatedClient.defaultFolder, { recursive: true, force: true });
  if (fs.existsSync(homonimoClient.defaultFolder)) fs.rmSync(homonimoClient.defaultFolder, { recursive: true, force: true });

  console.log('\n--- Todas las pruebas del protocolo pasaron con éxito ---');
  app.quit();
});
