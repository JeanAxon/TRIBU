const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');
const pkgVersion = pkg.version;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1024,
    height: 1024,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false
    }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
        canvas { display: block; }
      </style>
    </head>
    <body>
      <canvas id="iconCanvas" width="1024" height="1024"></canvas>
      <canvas id="logoCanvas" width="1600" height="600"></canvas>
      <script>
        function drawAppIcon(canvas) {
          const ctx = canvas.getContext('2d');
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Margen para padding visual
          const pad = w * 0.04;
          const size = w - pad * 2;
          const r = size * 0.22; // Radio esquinas squircle
          const x = pad;
          const y = pad;

          // 1. Sombra suave exterior
          ctx.save();
          ctx.shadowColor = 'rgba(2, 14, 38, 0.6)';
          ctx.shadowBlur = w * 0.05;
          ctx.shadowOffsetY = w * 0.025;

          // Fondo Squircle con Gradiente Institucional SRI
          const bgGrad = ctx.createLinearGradient(x, y, x + size, y + size);
          bgGrad.addColorStop(0, '#0c4fa8');    // Azul SRI vibrante
          bgGrad.addColorStop(0.5, '#073273');  // Azul marino profundo
          bgGrad.addColorStop(1, '#03173d');    // Azul noche institucional

          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + size - r, y);
          ctx.quadraticCurveTo(x + size, y, x + size, y + r);
          ctx.lineTo(x + size, y + size - r);
          ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
          ctx.lineTo(x + r, y + size);
          ctx.quadraticCurveTo(x, y + size, x, y + size - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fillStyle = bgGrad;
          ctx.fill();
          ctx.restore();

          // 2. Borde sutil reflectivo interior
          ctx.save();
          ctx.lineWidth = w * 0.008;
          const borderGrad = ctx.createLinearGradient(x, y, x, y + size);
          borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
          borderGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.25)');
          borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
          ctx.strokeStyle = borderGrad;
          ctx.stroke();
          ctx.restore();

          // 3. Resplandor interno sutil superior (iluminación de domo)
          ctx.save();
          const glow = ctx.createRadialGradient(w * 0.5, y + size * 0.25, 10, w * 0.5, y + size * 0.3, size * 0.6);
          glow.addColorStop(0, 'rgba(56, 189, 248, 0.20)');
          glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(w * 0.5, y + size * 0.4, size * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 4. Elementos del Emblema Central TRIBU:
          // Diseñado como una "T" geométrica combinada con un documento de facturación y un ala/flecha de progreso
          const cx = w * 0.5;
          const cy = h * 0.5;

          // A) Barra superior horizontal de la "T" (Estilo Escudo / Barra tecnológica)
          ctx.save();
          const tWidth = size * 0.58;
          const tHeight = size * 0.125;
          const tRadius = tHeight * 0.35;
          const tx = cx - tWidth / 2;
          const ty = cy - size * 0.26;

          const barGrad = ctx.createLinearGradient(tx, ty, tx + tWidth, ty);
          barGrad.addColorStop(0, '#38bdf8');   // Cyan eléctrico
          barGrad.addColorStop(0.5, '#ffffff'); // Reflejo blanco nítido
          barGrad.addColorStop(1, '#00d293');   // Verde esmeralda tributario

          ctx.shadowColor = 'rgba(0, 210, 147, 0.45)';
          ctx.shadowBlur = w * 0.03;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(tx, ty, tWidth, tHeight, tRadius) : ctx.rect(tx, ty, tWidth, tHeight);
          ctx.fillStyle = barGrad;
          ctx.fill();
          ctx.restore();

          // B) Documento plegado detrás del pilar central (simbolizando comprobantes electrónicos SRI)
          ctx.save();
          const docW = size * 0.28;
          const docH = size * 0.38;
          const docX = cx - docW * 0.35;
          const docY = cy - size * 0.14;

          const docGrad = ctx.createLinearGradient(docX, docY, docX + docW, docY + docH);
          docGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
          docGrad.addColorStop(1, 'rgba(56, 189, 248, 0.08)');

          ctx.beginPath();
          ctx.moveTo(docX, docY);
          ctx.lineTo(docX + docW * 0.72, docY);
          ctx.lineTo(docX + docW, docY + docW * 0.28);
          ctx.lineTo(docX + docW, docY + docH);
          ctx.lineTo(docX, docY + docH);
          ctx.closePath();
          ctx.fillStyle = docGrad;
          ctx.fill();

          // Líneas interiores del documento simulando factura XML
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = w * 0.007;
          ctx.lineCap = 'round';
          for (let li = 1; li <= 3; li++) {
            const ly = docY + docH * 0.35 + li * (docH * 0.16);
            ctx.beginPath();
            ctx.moveTo(docX + docW * 0.22, ly);
            ctx.lineTo(docX + docW * (li === 3 ? 0.6 : 0.8), ly);
            ctx.stroke();
          }
          ctx.restore();

          // C) Pilar vertical de la "T" (Flecha dinámica ascendente hacia el éxito)
          ctx.save();
          const stemW = size * 0.165;
          const stemTop = cy - size * 0.16;
          const stemBottom = cy + size * 0.28;

          const stemGrad = ctx.createLinearGradient(cx - stemW / 2, stemTop, cx + stemW / 2, stemBottom);
          stemGrad.addColorStop(0, '#ffffff');
          stemGrad.addColorStop(0.3, '#38bdf8');
          stemGrad.addColorStop(1, '#00d293');

          ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
          ctx.shadowBlur = w * 0.035;

          ctx.beginPath();
          ctx.moveTo(cx - stemW / 2, stemTop);
          ctx.lineTo(cx + stemW / 2, stemTop);
          ctx.lineTo(cx + stemW / 2, stemBottom - stemW * 0.5);
          ctx.lineTo(cx, stemBottom);
          ctx.lineTo(cx - stemW / 2, stemBottom - stemW * 0.5);
          ctx.closePath();
          ctx.fillStyle = stemGrad;
          ctx.fill();
          ctx.restore();

          // D) Palomita / Checkmark de conformidad SRI en la base
          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = w * 0.018;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = w * 0.02;

          ctx.beginPath();
          ctx.moveTo(cx - size * 0.10, cy + size * 0.10);
          ctx.lineTo(cx - size * 0.02, cy + size * 0.18);
          ctx.lineTo(cx + size * 0.14, cy + size * 0.02);
          ctx.stroke();
          ctx.restore();

          // E) 3 Nodos estelares representando la "Tribu" (Clientes, Contador, SRI)
          const dots = [
            { x: cx - size * 0.22, y: cy + size * 0.20, color: '#38bdf8', r: w * 0.018 },
            { x: cx, y: cy + size * 0.35, color: '#00d293', r: w * 0.022 },
            { x: cx + size * 0.22, y: cy + size * 0.20, color: '#38bdf8', r: w * 0.018 }
          ];

          dots.forEach(d => {
            ctx.save();
            ctx.shadowColor = d.color;
            ctx.shadowBlur = w * 0.025;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fillStyle = d.color;
            ctx.fill();
            ctx.restore();
          });
        }

        function drawHorizontalLogo(canvas) {
          const ctx = canvas.getContext('2d');
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Fondo transparente o sutil para vista previa
          const iconSize = h * 0.78;
          const iconX = h * 0.12;
          const iconY = h * 0.11;

          // Dibujar el icono en un sub-canvas y estamparlo
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 1024;
          tempCanvas.height = 1024;
          drawAppIcon(tempCanvas);

          ctx.drawImage(tempCanvas, iconX, iconY, iconSize, iconSize);

          // Texto "TRIBU"
          const textX = iconX + iconSize + h * 0.12;
          ctx.save();
          ctx.font = '900 ' + (h * 0.38) + 'px "Segoe UI", system-ui, sans-serif';
          const textGrad = ctx.createLinearGradient(textX, 0, textX + h * 1.5, 0);
          textGrad.addColorStop(0, '#0c4597');   // Azul SRI
          textGrad.addColorStop(0.6, '#072a59'); // Azul Marino
          textGrad.addColorStop(1, '#00d293');   // Verde esmeralda
          ctx.fillStyle = textGrad;
          ctx.fillText('TRIBU', textX, h * 0.52);

          // Subtítulo "ASISTENTE CONTABLE Y SRI ECUADOR"
          ctx.font = '700 ' + (h * 0.11) + 'px "Segoe UI", system-ui, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.letterSpacing = '3px';
          ctx.fillText('ASISTENTE CONTABLE & SRI ECUADOR', textX + 4, h * 0.69);

          // Badge de Versión
          const versionTag = 'v${pkgVersion}';
          ctx.font = '800 ' + (h * 0.075) + 'px "Segoe UI", system-ui, sans-serif';
          const textMetrics = ctx.measureText(versionTag);
          const padX = h * 0.05;
          const bW = Math.max(h * 0.22, textMetrics.width + (padX * 2));
          const bH = h * 0.12;
          const badgeX = textX + (h * 1.15);
          const badgeY = h * 0.26;

          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(badgeX, badgeY, bW, bH, bH * 0.4) : ctx.rect(badgeX, badgeY, bW, bH);
          ctx.fill();

          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#38bdf8';
          ctx.stroke();

          ctx.fillStyle = '#0284c7';
          ctx.fillText(versionTag, badgeX + (bW - textMetrics.width) / 2, badgeY + (bH * 0.72));
          ctx.restore();
        }

        const iconCanvas = document.getElementById('iconCanvas');
        drawAppIcon(iconCanvas);

        const logoCanvas = document.getElementById('logoCanvas');
        drawHorizontalLogo(logoCanvas);
      </script>
    </body>
    </html>
  `;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

  // Generar PNGs en múltiples resoluciones
  const sizes = [1024, 512, 256, 128, 64, 48, 32, 16];
  const pngBuffers = {};

  const assetsDir = path.join(__dirname, '../assets');
  const buildDir = path.join(__dirname, '../build');
  const rendererAssets = path.join(__dirname, '../src/renderer/assets');

  [assetsDir, buildDir, rendererAssets].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  for (const s of sizes) {
    const dataUrl = await win.webContents.executeJavaScript(`
      (function() {
        const c = document.createElement('canvas');
        c.width = ${s};
        c.height = ${s};
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(document.getElementById('iconCanvas'), 0, 0, ${s}, ${s});
        return c.toDataURL('image/png');
      })()
    `);
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    pngBuffers[s] = buf;
    fs.writeFileSync(path.join(assetsDir, `icon_${s}x${s}.png`), buf);
  }

  // Guardar icono principal 512x512 y 256x256 en build/ y src/renderer/assets/
  fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffers[512]);
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuffers[512]);
  fs.writeFileSync(path.join(rendererAssets, 'icon.png'), pngBuffers[256]);

  // Generar Banner / Logo Horizontal completo
  const logoDataUrl = await win.webContents.executeJavaScript(`
    document.getElementById('logoCanvas').toDataURL('image/png')
  `);
  const logoBuf = Buffer.from(logoDataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(assetsDir, 'tribu_logo_horizontal.png'), logoBuf);
  fs.writeFileSync(path.join(buildDir, 'tribu_logo_horizontal.png'), logoBuf);
  fs.writeFileSync(path.join(rendererAssets, 'tribu_logo_horizontal.png'), logoBuf);

  // Crear archivo ICO válido para Windows (empaquetando 256, 128, 64, 48, 32, 16)
  const icoSizes = [256, 128, 64, 48, 32, 16];
  const count = icoSizes.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reservado
  header.writeUInt16LE(1, 2); // Tipo 1 = ICO
  header.writeUInt16LE(count, 4); // Cantidad de imágenes

  const entries = [];
  for (const sz of icoSizes) {
    const pBuf = pngBuffers[sz];
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(sz >= 256 ? 0 : sz, 0); // width (0 = 256)
    entry.writeUInt8(sz >= 256 ? 0 : sz, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pBuf.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    entries.push(entry);
    offset += pBuf.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...entries,
    ...icoSizes.map(sz => pngBuffers[sz])
  ]);

  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
  fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);

  try {
    const png2icons = require('png2icons');
    const icnsBuffer = png2icons.createICNS(pngBuffers[1024] || pngBuffers[512], png2icons.BILINEAR, 0);
    if (icnsBuffer) {
      fs.writeFileSync(path.join(buildDir, 'icon.icns'), icnsBuffer);
      fs.writeFileSync(path.join(assetsDir, 'icon.icns'), icnsBuffer);
      console.log('[OK] Archivo icon.icns para macOS generado exitosamente');
    }
  } catch (e) {
    console.warn('Aviso generando ICNS:', e.message);
  }

  console.log('[OK] Imágenes de alta calidad y archivos de iconos (ICO e ICNS) generados exitosamente');
  app.quit();
});
