const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

async function main() {
  console.log('--- Publicando Release v0.1.0-alpha en GitHub ---');

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
  const tag = 'v0.1.0-alpha';

  const releaseNotes = `
# TRIBU - Asistente Contable y Tributario SRI Ecuador (v0.1.0-alpha) 🚀

Versión inicial oficial de TRIBU para Windows.

### ⬇️ Descarga e Instalación:
Descarga el archivo adjunto **\`TRIBU-Setup-0.1.0-alpha.exe\`** al final de esta publicación y ejecútalo para instalar en Windows 10/11.

---

### ⚡ Características principales:
- **Descargas Masivas:** Comprobantes electrónicos XML y RIDE (PDF) organizados por cliente, año y mes en segundos.
- **Reclamo Automático de IVA:** Llenado inteligente de la tabla de devolución (discapacidad y tercera edad).
- **Módulo ATS Oficial:** Generación de Anexo Transaccional en XML para DIMM/SRI y reportes en Excel/CSV.
- **Privacidad Local:** Contraseñas y sesiones aisladas cifradas con AES-256 en tu propio equipo.
- **Identidad Visual:** Icono institucional de alta calidad y animación de inicio.
`;

  // 2. Verificar o crear el Release
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

  console.log('1. Creando / Verificando el Release en GitHub...');
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
    // Actualizar descripción a la versión profesional y sencilla
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
      name: 'TRIBU v0.1.0-alpha - Versión Inicial (Windows)',
      body: releaseNotes.trim(),
      prerelease: true
    });
    console.log('[OK] Notas del Release actualizadas con formato profesional y conciso.');
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
      name: 'TRIBU v0.1.0-alpha - Versión Inicial (Windows)',
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

  // 3. Subir el archivo instalador (.exe)
  const installerPath = path.join(__dirname, '../dist/TRIBU Setup 0.1.0-alpha.exe');
  if (!fs.existsSync(installerPath)) {
    console.error('No se encontró el instalador en:', installerPath);
    process.exit(1);
  }

  const stat = fs.statSync(installerPath);
  const fileName = 'TRIBU-Setup-0.1.0-alpha.exe';

  // Verificar si el asset ya existe y está idéntico para evitar re-subidas innecesarias
  let needUpload = true;
  if (release.assets && release.assets.length > 0) {
    for (const a of release.assets) {
      if (a.name === fileName) {
        if (a.size === stat.size) {
          console.log(`[OK] El instalador ${fileName} ya está subido y sincronizado en GitHub (${(a.size / (1024 * 1024)).toFixed(2)} MB).`);
          needUpload = false;
        } else {
          console.log(`Eliminando versión anterior del asset ${a.name} (ID: ${a.id})...`);
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

  if (needUpload) {
    console.log(`2. Subiendo instalador ${fileName} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)...`);
    // Subir binario a uploads.github.com
    const uploadUrl = new URL(release.upload_url.replace(/\{(\?.*)?\}/, ''));
    uploadUrl.searchParams.set('name', fileName);

    const fileStream = fs.createReadStream(installerPath);

    const uploadReq = https.request({
      hostname: uploadUrl.hostname,
      path: uploadUrl.pathname + uploadUrl.search,
      method: 'POST',
      headers: {
        'User-Agent': 'TRIBU-Release-Script',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log(`\n🎉 [EXITO] ¡Instalador ${fileName} subido correctamente al Release!`);
          console.log(`URL del Release: ${release.html_url}`);
        } else {
          console.error('Error subiendo el asset:', res.statusCode, body);
        }
      });
    });

    uploadReq.on('error', (err) => {
      console.error('Error de red al subir el asset:', err);
    });

    let uploadedBytes = 0;
    fileStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const pct = Math.round((uploadedBytes / stat.size) * 100);
      process.stdout.write(`\rProgreso de subida: ${pct}% (${(uploadedBytes / (1024 * 1024)).toFixed(1)} / ${(stat.size / (1024 * 1024)).toFixed(1)} MB)`);
    });

    fileStream.pipe(uploadReq);
  } else {
    console.log(`URL del Release: ${release.html_url}`);
  }
}

main().catch(console.error);
