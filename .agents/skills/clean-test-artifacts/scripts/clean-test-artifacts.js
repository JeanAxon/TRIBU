/**
 * clean-test-artifacts.js
 * 
 * Script autónomo para limpiar residuos de pruebas, carpetas simuladas,
 * clientes ficticios en storage y archivos temporales generados durante
 * la ejecución de tests automatizados.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Argumentos
const isDryRun = process.argv.includes('--dry-run');

console.log('======================================================');
console.log('   TRIBU - LIMPIEZA DE ARTEFACTOS Y CARPETAS DE PRUEBA');
console.log('======================================================');
if (isDryRun) {
  console.log('[MODO DRY-RUN ACTIVADO: No se eliminará ningún archivo]');
}

let cleanedCount = 0;
let preservedCount = 0;

// 1. Localizar rutas clave del sistema
const homeDir = os.homedir();
const defaultSriFolder = path.join(homeDir, 'Documents', 'SRI_Clientes');
const roamingDir = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
const tribuStorageDir = path.join(roamingDir, 'tribu-sri');
const tribuClientsFile = path.join(tribuStorageDir, 'tribu_clients.json');
const tribuConfigFile = path.join(tribuStorageDir, 'tribu_config.json');

// RUCs y patrones conocidos de pruebas automáticas
const TEST_RUCS = new Set([
  '1790012345001',
  '9999999999001',
  '0991112223001',
  '0998887776001',
  '1234567890001'
]);

const TEST_FOLDER_PATTERNS = [
  /^Prueba Empresa/i,
  /^PEREZ LOPEZ/i,
  /^GONZAL(E|É)Z P(E|É)REZ/i,
  /^Test\s/i,
  /^Cliente_Prueba/i,
  /1790012345001/,
  /9999999999001/,
  /0991112223001/,
  /0998887776001/
];

// Determinar la carpeta base real configurada
let clientBaseFolder = defaultSriFolder;
if (fs.existsSync(tribuConfigFile)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(tribuConfigFile, 'utf8'));
    if (cfg.baseFolder && fs.existsSync(cfg.baseFolder)) {
      clientBaseFolder = cfg.baseFolder;
    }
  } catch (e) {}
}

console.log(`\n1. Verificando carpeta base de clientes: ${clientBaseFolder}`);

// Leer clientes reales en storage
let realClientFolders = new Set();
let realClients = [];
if (fs.existsSync(tribuClientsFile)) {
  try {
    const clients = JSON.parse(fs.readFileSync(tribuClientsFile, 'utf8'));
    let filteredClients = [];
    let removedFromStorage = 0;

    for (const c of clients) {
      const isTestRuc = TEST_RUCS.has(c.ruc) || TEST_RUCS.has(c.id);
      const isTestName = TEST_FOLDER_PATTERNS.some(p => p.test(c.razonSocial || ''));

      if (isTestRuc || isTestName) {
        console.log(`   [STORAGE] Detectado cliente de prueba en base de datos: [${c.ruc}] ${c.razonSocial}`);
        removedFromStorage++;
      } else {
        filteredClients.push(c);
        if (c.defaultFolder) {
          realClientFolders.add(path.resolve(c.defaultFolder).toLowerCase());
        }
      }
    }

    if (removedFromStorage > 0) {
      if (!isDryRun) {
        fs.writeFileSync(tribuClientsFile, JSON.stringify(filteredClients, null, 2), 'utf8');
        console.log(`   [STORAGE] Se eliminaron ${removedFromStorage} cliente(s) de prueba de tribu_clients.json.`);
      } else {
        console.log(`   [DRY-RUN] Se habrían eliminado ${removedFromStorage} cliente(s) de prueba de tribu_clients.json.`);
      }
      cleanedCount += removedFromStorage;
    } else {
      console.log(`   [STORAGE] Base de datos limpia: ${filteredClients.length} cliente(s) legítimo(s) registrado(s).`);
    }

    realClients = filteredClients;
  } catch (err) {
    console.warn('   [AVISO] No se pudo leer tribu_clients.json:', err.message);
  }
}

// 2. Escaneo y limpieza en SRI_Clientes
if (fs.existsSync(clientBaseFolder)) {
  console.log(`\n2. Escaneando carpetas en: ${clientBaseFolder}`);
  const items = fs.readdirSync(clientBaseFolder);

  for (const item of items) {
    const itemPath = path.join(clientBaseFolder, item);
    const resolvedPath = path.resolve(itemPath).toLowerCase();

    let stat;
    try {
      stat = fs.statSync(itemPath);
    } catch (e) {
      continue;
    }

    if (!stat.isDirectory()) continue;

    // Verificar si es una carpeta de cliente legítimo
    if (realClientFolders.has(resolvedPath)) {
      console.log(`   [PRESERVADO] Cliente legítimo: ${item}`);
      preservedCount++;
      continue;
    }

    // Verificar si coincide con patrones de pruebas
    const isTestFolder = TEST_FOLDER_PATTERNS.some(p => p.test(item));

    if (isTestFolder) {
      console.log(`   [ELIMINANDO] Carpeta de prueba detectada: ${item}`);
      if (!isDryRun) {
        try {
          fs.rmSync(itemPath, { recursive: true, force: true });
          console.log(`   -> Eliminada exitosamente.`);
          cleanedCount++;
        } catch (err) {
          console.error(`   -> Error al eliminar ${item}: ${err.message}`);
        }
      } else {
        console.log(`   -> [DRY-RUN] Habría sido eliminada.`);
        cleanedCount++;
      }
    } else {
      // Carpeta existente no registrada formalmente pero tampoco con nombre de test
      console.log(`   [PRESERVADO] Carpeta de usuario conservada: ${item}`);
      preservedCount++;
    }
  }
} else {
  console.log(`\n2. Carpeta base ${clientBaseFolder} no encontrada.`);
}

// 3. Limpieza de carpetas temporales de pruebas en os.tmpdir()
console.log(`\n3. Escaneando directorio temporal del sistema (${os.tmpdir()})...`);
try {
  const tmpEntries = fs.readdirSync(os.tmpdir());
  let tmpCleaned = 0;
  for (const entry of tmpEntries) {
    if (entry.startsWith('tribu_test_') || entry.startsWith('tribu_inv_') || entry.startsWith('tribu_ats_')) {
      const entryPath = path.join(os.tmpdir(), entry);
      if (!isDryRun) {
        try {
          fs.rmSync(entryPath, { recursive: true, force: true });
          tmpCleaned++;
        } catch (e) {}
      } else {
        tmpCleaned++;
      }
    }
  }
  if (tmpCleaned > 0) {
    console.log(`   -> Limpiados ${tmpCleaned} directorio(s) temporal(es) de tests.`);
    cleanedCount += tmpCleaned;
  } else {
    console.log('   -> Directorio temporal limpio (sin residuos temporales de tribu).');
  }
} catch (e) {
  console.warn('   [AVISO] No se pudo escanear os.tmpdir():', e.message);
}

// 4. Limpieza de archivos debug o volcados temporales en el workspace del proyecto
const workspaceRoot = path.resolve(__dirname, '..', '..', '..', '..');
console.log(`\n4. Escaneando archivos temporales en el proyecto (${workspaceRoot})...`);
try {
  const files = fs.readdirSync(workspaceRoot);
  let wsCleaned = 0;
  for (const f of files) {
    if (f.startsWith('tmp_') || f.endsWith('.test.tmp') || (f.includes('debug_dump') && f.endsWith('.json'))) {
      const filePath = path.join(workspaceRoot, f);
      if (!isDryRun) {
        try {
          fs.unlinkSync(filePath);
          wsCleaned++;
        } catch (e) {}
      } else {
        wsCleaned++;
      }
    }
  }
  if (wsCleaned > 0) {
    console.log(`   -> Limpiados ${wsCleaned} archivo(s) temporal(es) del proyecto.`);
    cleanedCount += wsCleaned;
  } else {
    console.log('   -> Raíz del proyecto limpia.');
  }
} catch (e) {}

// Resumen final
console.log('\n======================================================');
console.log(`   RESUMEN: ${cleanedCount} artefacto(s) limpiado(s), ${preservedCount} carpeta(s) legítima(s) protegida(s).`);
console.log('======================================================\n');
