const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const version = pkg.version;
  const tag = `v${version}`;

  console.log(`--- Publicando Release ${tag} en GitHub ---`);

  // 1. Obtener token seguro de Git Credential Manager
  let token = null;
  try {
    const credOut = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8'
    });
    const m = credOut.match(/password=(.+)/);
    if (m) token = m[1].trim();
  } catch (e) {
    console.error('Error al obtener credenciales:', e.message);
  }

  if (!token) {
    console.error('No se pudo obtener el token de GitHub desde Git Credential Manager.');
    process.exit(1);
  }

  const repo = 'JeanAxon/TRIBU';

  const releaseNotes = `
# TRIBU - Asistente Contable y Tributario SRI Ecuador (${tag}) 🚀

Versión oficial de TRIBU para Windows con soporte de actualización automática y mejoras de interfaz.

### ⬇️ Descarga e Instalación:
Descarga el archivo adjunto **\`TRIBU-Setup-${version}.exe\`** al final de esta publicación y ejecútalo para instalar en Windows 10/11.

---

### ⚡ Novedades y Características principales:
- **Actualizaciones Automáticas:** A partir de esta versión, TRIBU detecta y descarga actualizaciones automáticamente en segundo plano.
- **Pantalla de Inicio con Logo Animado:** Nueva identidad visual con carga animada elegante y representativa del ecosistema tributario ecuatoriano.
- **Descargas Masivas SRI:** Comprobantes electrónicos XML y RIDE (PDF) organizados por cliente, año y mes en segundos.
- **Reclamo Automático de IVA:** Llenado inteligente de la tabla de devolución (discapacidad y tercera edad).
- **Módulo ATS Oficial:** Generación de Anexo Transaccional en XML para DIMM/SRI y reportes en Excel/CSV.
- **Privacidad Local Total:** Contraseñas y sesiones aisladas cifradas con AES-256 en tu propio equipo.
`;

  // Helper para llamadas a GitHub REST API
  function apiRequest(options, postData) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(body) });
          } catch(e) {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: body });
          }
        });
      });
      req.on('error', reject);
      if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      req.end();
    });
  }

  console.log(`1. Creando / Verificando el Release ${tag} en GitHub...`);
  let release = null;
  const getRelRes = await apiRequest({
    hostname: 'api.github.com',
    path: `/repos/${repo}/releases/tags/${tag}`,
    method: 'GET',
    headers: {
      'User-Agent': 'TRIBU-Release-Script',
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (getRelRes.statusCode === 200) {
    console.log('[OK] Release existente encontrado con ID:', getRelRes.data.id);
    release = getRelRes.data;
    await apiRequest({
      hostname: 'api.github.com',
      path: `/repos/${repo}/releases/${release.id}`,
      method: 'PATCH',
      headers: {
        'User-Agent': 'TRIBU-Release-Script',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, {
      name: `TRIBU ${tag} - Asistente SRI (Windows)`,
      body: releaseNotes.trim(),
      prerelease: true
    });
    console.log('[OK] Notas del Release actualizadas.');
  } else {
    const createRes = await apiRequest({
      hostname: 'api.github.com',
      path: `/repos/${repo}/releases`,
      method: 'POST',
      headers: {
        'User-Agent': 'TRIBU-Release-Script',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, {
      tag_name: tag,
      name: `TRIBU ${tag} - Asistente SRI (Windows)`,
      body: releaseNotes.trim(),
      draft: false,
      prerelease: true
    });

    if (createRes.statusCode === 201) {
      console.log('[OK] Release creado con éxito en GitHub. ID:', createRes.data.id);
      release = createRes.data;
    } else {
      console.error('Error creando el release:', createRes.statusCode, createRes.data);
      process.exit(1);
    }
  }

  // Subir assets necesarios para instalación y auto-actualizaciones (latest.yml, exe, blockmap)
  const distDir = path.join(__dirname, '../dist');
  const candidateFiles = [
    `TRIBU-Setup-${version}.exe`,
    `TRIBU Setup ${version}.exe`,
    'latest.yml',
    `TRIBU-Setup-${version}.exe.blockmap`,
    `TRIBU Setup ${version}.exe.blockmap`
  ];

  const filesToUpload = [];
  for (const f of candidateFiles) {
    const p = path.join(distDir, f);
    if (fs.existsSync(p)) {
      // Normalizar nombre remoto para que coincida con lo esperado por electron-updater
      const remoteName = f.replace(/ /g, '-');
      // Evitar duplicados
      if (!filesToUpload.some(x => x.remoteName === remoteName)) {
        filesToUpload.push({ localPath: p, remoteName, stat: fs.statSync(p) });
      }
    }
  }

  if (filesToUpload.length === 0) {
    console.error('No se encontraron archivos en dist/ para subir.');
    process.exit(1);
  }

  console.log(`\n2. Sincronizando ${filesToUpload.length} archivo(s) con GitHub Releases...`);

  async function uploadFile(fileObj) {
    const { localPath, remoteName, stat } = fileObj;

    // Verificar si ya existe en el release
    if (release.assets && release.assets.length > 0) {
      for (const a of release.assets) {
        if (a.name === remoteName) {
          if (a.size === stat.size) {
            console.log(`[OK] ${remoteName} ya está actualizado en GitHub (${(stat.size / 1024).toFixed(1)} KB).`);
            return;
          } else {
            console.log(`Eliminando versión anterior de ${a.name} (ID: ${a.id})...`);
            await apiRequest({
              hostname: 'api.github.com',
              path: `/repos/${repo}/releases/assets/${a.id}`,
              method: 'DELETE',
              headers: {
                'User-Agent': 'TRIBU-Release-Script',
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            });
          }
        }
      }
    }

    console.log(`Subiendo ${remoteName} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)...`);
    const uploadUrl = new URL(release.upload_url.replace(/\{(\?.*)?\}/, ''));
    uploadUrl.searchParams.set('name', remoteName);

    const fileStream = fs.createReadStream(localPath);

    return new Promise((resolve, reject) => {
      const uploadReq = https.request({
        hostname: uploadUrl.hostname,
        path: uploadUrl.pathname + uploadUrl.search,
        method: 'POST',
        headers: {
          'User-Agent': 'TRIBU-Release-Script',
          'Authorization': `token ${token}`,
          'Content-Type': remoteName.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream',
          'Content-Length': stat.size,
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 201) {
            console.log(`\n🎉 [OK] ${remoteName} subido correctamente.`);
            resolve();
          } else {
            console.error(`Error subiendo ${remoteName}:`, res.statusCode, body);
            reject(new Error(`Fallo subida ${remoteName}`));
          }
        });
      });

      uploadReq.on('error', (err) => {
        console.error(`Error de red subiendo ${remoteName}:`, err);
        reject(err);
      });

      let uploadedBytes = 0;
      fileStream.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        const pct = Math.round((uploadedBytes / stat.size) * 100);
        process.stdout.write(`\rProgreso [${remoteName}]: ${pct}% (${(uploadedBytes / (1024 * 1024)).toFixed(1)} / ${(stat.size / (1024 * 1024)).toFixed(1)} MB)`);
      });

      fileStream.pipe(uploadReq);
    });
  }

  for (const item of filesToUpload) {
    await uploadFile(item);
  }

  console.log(`\n🚀 ¡Release ${tag} publicado exitosamente en GitHub!`);
  console.log(`URL del Release: ${release.html_url}`);
}

main().catch(console.error);
