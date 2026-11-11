const { app } = require('electron');
const { EventEmitter } = require('events');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

class MacUpdater extends EventEmitter {
  constructor() {
    super();
    this.autoDownload = true;
    this.autoInstallOnAppQuit = true;
    this.repo = 'JeanAxon/TRIBU';
    this.downloadedUpdate = null;
    this.isDownloading = false;
    this._isInstalling = false;

    try {
      if (app && typeof app.on === 'function') {
        app.on('before-quit', () => {
          if (this.autoInstallOnAppQuit && this.downloadedUpdate && !this._isInstalling) {
            this.quitAndInstall(false);
          }
        });
      }
    } catch (e) {}
  }

  // Compara versiones semver simples (ej: '0.1.5' > '0.1.4')
  compareVersions(v1, v2) {
    const clean = v => v.replace(/^v/, '').split('-')[0].split('.').map(Number);
    const p1 = clean(v1);
    const p2 = clean(v2);
    for (let i = 0; i < 3; i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }

  // Petición HTTP con soporte de redirecciones automáticas (301, 302, 307)
  requestWithRedirects(url, options = {}, redirectCount = 0) {
    return new Promise((resolve, reject) => {
      if (redirectCount > 8) {
        return reject(new Error('Demasiadas redirecciones al descargar actualización'));
      }

      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const headers = {
        'User-Agent': 'TRIBU-macOS-AutoUpdater',
        'Accept': 'application/vnd.github.v3+json',
        ...(options.headers || {})
      };

      const req = client.get(url, { headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).href;
          return resolve(this.requestWithRedirects(redirectUrl, options, redirectCount + 1));
        }
        resolve(res);
      });

      req.on('error', reject);
    });
  }

  async checkForUpdates() {
    this.emit('checking-for-update');
    try {
      const apiUrl = `https://api.github.com/repos/${this.repo}/releases/latest`;
      const res = await this.requestWithRedirects(apiUrl);

      if (res.statusCode !== 200) {
        throw new Error(`Error consultando GitHub Releases (HTTP ${res.statusCode})`);
      }

      let body = '';
      res.on('data', chunk => body += chunk);
      await new Promise(resolve => res.on('end', resolve));

      const release = JSON.parse(body);
      const latestTag = release.tag_name || '';
      const latestVersion = latestTag.replace(/^v/, '');
      const currentVersion = app.getVersion();

      if (this.compareVersions(latestVersion, currentVersion) > 0) {
        this.emit('update-available', {
          version: latestVersion,
          releaseNotes: release.body,
          release
        });

        if (this.autoDownload) {
          await this.downloadUpdate(release, latestVersion);
        }
        return { updateInfo: { version: latestVersion } };
      } else {
        this.emit('update-not-available', { version: currentVersion });
        return { updateInfo: { version: currentVersion } };
      }
    } catch (err) {
      console.warn('[MacUpdater] Error comprobando actualización:', err.message);
      this.emit('error', err);
      return null;
    }
  }

  async checkForUpdatesAndNotify() {
    return this.checkForUpdates();
  }

  async downloadUpdate(release, targetVersion) {
    if (this.isDownloading) return;
    this.isDownloading = true;

    try {
      // 1. Localizar archivo ZIP en los assets del Release
      const assets = release.assets || [];
      const arch = process.arch; // 'arm64' o 'x64'

      // Priorizar el zip universal o el de la arquitectura del equipo
      let targetAsset = assets.find(a => a.name.includes(`mac-${arch}`) && a.name.endsWith('.zip'))
        || assets.find(a => a.name.includes('universal') && a.name.endsWith('.zip'))
        || assets.find(a => a.name.endsWith('.zip'));

      if (!targetAsset) {
        throw new Error('No se encontró archivo .zip de actualización para macOS en el Release');
      }

      const tempDir = app.getPath('temp');
      const zipPath = path.join(tempDir, `tribu-update-${targetVersion}.zip`);
      const extractDir = path.join(tempDir, `tribu-update-${targetVersion}`);

      console.log(`[MacUpdater] Descargando ${targetAsset.name} (${(targetAsset.size / 1024 / 1024).toFixed(1)} MB)...`);

      // 2. Descargar archivo con seguimiento de progreso
      const downloadRes = await this.requestWithRedirects(targetAsset.browser_download_url);
      if (downloadRes.statusCode !== 200) {
        throw new Error(`Error al descargar actualización (HTTP ${downloadRes.statusCode})`);
      }
      const totalBytes = parseInt(downloadRes.headers['content-length'] || targetAsset.size, 10);
      let downloadedBytes = 0;

      const fileStream = fs.createWriteStream(zipPath);

      await new Promise((resolve, reject) => {
        downloadRes.on('data', chunk => {
          downloadedBytes += chunk.length;
          const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          this.emit('download-progress', {
            percent,
            transferred: downloadedBytes,
            total: totalBytes
          });
        });

        downloadRes.pipe(fileStream);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
        downloadRes.on('error', reject);
      });

      console.log('[MacUpdater] Descarga finalizada. Extrayendo con /usr/bin/ditto...');

      // 3. Extraer usando ditto nativo de macOS (preserva enlaces y permisos de ejecución)
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
      fs.mkdirSync(extractDir, { recursive: true });

      await new Promise((resolve, reject) => {
        execFile('/usr/bin/ditto', ['-xk', zipPath, extractDir], (err) => {
          if (err) return reject(new Error('Fallo al extraer el paquete: ' + err.message));
          resolve();
        });
      });

      // 4. Buscar el paquete .app extraído (búsqueda recursiva por seguridad)
      function findAppBundle(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.endsWith('.app')) {
            return path.join(dir, entry.name);
          }
          if (entry.isDirectory() && entry.name !== '__MACOSX') {
            const sub = findAppBundle(path.join(dir, entry.name));
            if (sub) return sub;
          }
        }
        return null;
      }

      const extractedAppPath = findAppBundle(extractDir);
      if (!extractedAppPath) {
        throw new Error('No se encontró el paquete .app en el archivo extraído');
      }

      this.downloadedUpdate = {
        version: targetVersion,
        zipPath,
        extractDir,
        extractedAppPath
      };

      this.isDownloading = false;
      console.log('[MacUpdater] Actualización lista para instalar:', targetVersion);
      this.emit('update-downloaded', { version: targetVersion });
    } catch (err) {
      this.isDownloading = false;
      console.warn('[MacUpdater] Error descargando actualización:', err.message);
      this.emit('error', err);
    }
  }

  // Reemplaza el paquete .app en /Applications de forma silenciosa sin requerir ShipIt ni firmas de pago
  quitAndInstall(relaunch = true) {
    if (this._isInstalling) return;
    this._isInstalling = true;

    if (!this.downloadedUpdate) {
      console.warn('[MacUpdater] No hay actualización descargada lista para instalar.');
      app.quit();
      return;
    }

    const { zipPath, extractDir, extractedAppPath, version } = this.downloadedUpdate;

    // Detectar ruta del bundle actual (ej: /Applications/TRIBU.app)
    const currentExe = process.execPath;
    const targetAppPath = path.resolve(currentExe, '../../..');

    if (!targetAppPath.endsWith('.app')) {
      console.warn('[MacUpdater] Ejecutable no está dentro de un bundle .app:', currentExe);
      app.quit();
      return;
    }

    console.log(`[MacUpdater] Aplicando actualización a ${targetAppPath}...`);

    // Script bash autónomo que espera la salida de TRIBU, reemplaza el .app y relanza si corresponde
    const scriptPath = path.join(app.getPath('temp'), 'tribu_apply_mac_update.sh');
    const scriptContent = `#!/bin/bash
TARGET_PID=${process.pid}
TARGET_APP="${targetAppPath}"
NEW_APP="${extractedAppPath}"
TEMP_ZIP="${zipPath}"
TEMP_DIR="${extractDir}"
RELAUNCH=${relaunch ? '1' : '0'}

# 1. Esperar a que el proceso actual de TRIBU termine
while kill -0 "$TARGET_PID" 2>/dev/null; do
  sleep 0.1
done
sleep 0.2

# 2. Reemplazar la aplicación en su ubicación original
if [ -d "$NEW_APP" ]; then
  rm -rf "$TARGET_APP"
  mv "$NEW_APP" "$TARGET_APP"

  # Eliminar atributo de cuarentena de Apple Gatekeeper para apertura inmediata
  xattr -cr "$TARGET_APP" 2>/dev/null || true

  # 3. Relanzar la aplicación actualizada solo si fue solicitado
  if [ "$RELAUNCH" = "1" ]; then
    open "$TARGET_APP"
  fi
fi

# 4. Limpieza de archivos temporales
rm -f "$TEMP_ZIP"
rm -rf "$TEMP_DIR"
rm -f "$0"
`;

    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    // Despachar el script en un proceso independiente desacoplado del padre
    const child = spawn('/bin/bash', [scriptPath], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    // Salir inmediatamente para permitir que el script tome el control y relance
    app.exit(0);
  }
}

module.exports = new MacUpdater();
