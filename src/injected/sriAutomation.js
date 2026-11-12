/**
 * SRI Automation Scripts
 * Se inyectan en el webview para automatizar el login, captura de clave y descarga nombrada con Fecha + Razón Social.
 */

// Script para verificar el estado de inicio de sesión y rellenar credenciales
function getLoginScript(ruc, password) {
  const fn = async function(userRuc, userPass) {
    const isAlreadyLoggedIn = Boolean(
      document.querySelector('.nombre-contribuyente, .user-info, .sri-menu-usuario, #lblNombreUsuario, [class*="usuario-logueado"]') ||
      (window.location.href.includes('/sri-en-linea/') && !window.location.href.includes('/auth/'))
    );

    if (isAlreadyLoggedIn) {
      return {
        status: 'logged_in',
        message: 'Sesión activa detectada en el SRI'
      };
    }

    // Esperar hasta 4 segundos a que los elementos estén listos en el DOM
    await new Promise(resolve => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const u = document.querySelector('input#usuario');
        const p = document.querySelector('input#password');
        const err = document.querySelector('.alert-error, .kc-feedback-text, #input-error, .alert-danger, [class*="error-message"]');
        if ((u && p) || err || attempts >= 40) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });

    const errorAlert = document.querySelector('.alert-error, .kc-feedback-text, #input-error, .alert-danger, [class*="error-message"]');
    const errorMessage = errorAlert ? errorAlert.innerText.trim() : null;

    if (errorMessage) {
      return {
        status: 'login_error',
        message: errorMessage
      };
    }

    const userField = document.querySelector('input#usuario');
    const passField = document.querySelector('input#password');
    const hiddenUserField = document.querySelector('input#username');
    const loginBtn = document.querySelector('input#kc-login, button#kc-login, input[type="submit"][name="login"], input[type="submit"]');

    const hasCaptcha = Boolean(
      document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="captcha"], #captcha, div[class*="captcha"]')
    );

    if (userField && passField) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

      nativeSetter.call(userField, userRuc);
      if (typeof userField.setCustomValidity === 'function') userField.setCustomValidity('');
      userField.dispatchEvent(new Event('input', { bubbles: true }));
      userField.dispatchEvent(new Event('change', { bubbles: true }));

      if (hiddenUserField) {
        nativeSetter.call(hiddenUserField, userRuc.toUpperCase());
      }

      nativeSetter.call(passField, userPass);
      if (typeof passField.setCustomValidity === 'function') passField.setCustomValidity('');
      passField.dispatchEvent(new Event('input', { bubbles: true }));
      passField.dispatchEvent(new Event('change', { bubbles: true }));

      if (hasCaptcha) {
        return {
          status: 'needs_captcha',
          message: 'Se detectó un captcha o validación de seguridad. Resuélvelo en pantalla y presiona Ingresar.'
        };
      }

      if (loginBtn || document.querySelector('form#kc-form-login')) {
        setTimeout(() => {
          if (typeof window.validarUsuario === 'function' && passField.value.length < 100) {
            window.validarUsuario();
          }
          const form = document.querySelector('form#kc-form-login') || passField.form;
          if (form) {
            form.submit();
          } else if (loginBtn) {
            loginBtn.click();
          }
        }, 100);

        return {
          status: 'submitting',
          message: 'Enviando credenciales al SRI...'
        };
      }

      return {
        status: 'fields_filled',
        message: 'Credenciales ingresadas. Haz clic en Ingresar.'
      };
    }

    return {
      status: 'waiting',
      message: 'Cargando formulario de acceso del SRI...'
    };
  };

  return '(' + fn.toString() + ')(' + JSON.stringify(ruc) + ', ' + JSON.stringify(password) + ');';
}

// Script para capturar automáticamente la contraseña en texto plano que el usuario escriba en pantalla
function getPasswordCaptureScript() {
  const fn = function() {
    if (window.__tribuCaptureInstalled) return;
    window.__tribuCaptureInstalled = true;

    window.__tribuCapturedPassword = null;

    const reportPassword = (pass) => {
      if (pass && pass.length > 0 && pass.length < 100) {
        window.__tribuCapturedPassword = pass;
        try {
          sessionStorage.setItem('__tribuCapturedPassword', pass);
        } catch (e) {}
        console.log('__TRIBU_KEY__:' + pass);
      }
    };

    // Delegación de eventos en document para capturar en tiempo real cualquier ingreso de clave
    document.addEventListener('input', function(e) {
      if (e.target && (e.target.id === 'password' || e.target.type === 'password' || e.target.name === 'password')) {
        reportPassword(e.target.value);
      }
    }, true);

    document.addEventListener('change', function(e) {
      if (e.target && (e.target.id === 'password' || e.target.type === 'password' || e.target.name === 'password')) {
        reportPassword(e.target.value);
      }
    }, true);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        const p = document.querySelector('input#password, input[type="password"]');
        if (p && p.value && p.value.length < 100) {
          reportPassword(p.value);
        }
      }
    }, true);

    document.addEventListener('mousedown', function(e) {
      const btn = e.target.closest('#kc-login, input[type="submit"], button[type="submit"]');
      if (btn) {
        const p = document.querySelector('input#password, input[type="password"]');
        if (p && p.value && p.value.length < 100) {
          reportPassword(p.value);
        }
      }
    }, true);

    document.addEventListener('submit', function(e) {
      const p = document.querySelector('input#password, input[type="password"]');
      if (p && p.value && p.value.length < 100) {
        reportPassword(p.value);
      }
    }, true);
  };

  return '(' + fn.toString() + ')();';
}

// Script para analizar la página actual de comprobantes (detecta tabla, categoría y número de filas)
function getInspectComprobantesScript() {
  const fn = function() {
    const tables = Array.from(document.querySelectorAll('p-table, table.ui-table, .ui-datatable-tablewrapper table, table'));
    let mainTable = null;
    let rows = [];

    for (const t of tables) {
      const foundRows = Array.from(t.querySelectorAll('tbody tr'));
      const validRows = foundRows.filter(r => !r.innerText.includes('No se encontraron') && r.querySelectorAll('td').length > 3);
      if (validRows.length > 0) {
        mainTable = t;
        rows = validRows;
        break;
      }
    }

    const paginator = document.querySelector('.ui-paginator, p-paginator, .p-paginator');
    let totalRecordsText = '';
    let currentPage = 1;
    let totalPages = 1;

    if (paginator) {
      const activePageEl = paginator.querySelector('.ui-state-active, .p-highlight, .ui-paginator-page.ui-state-active');
      if (activePageEl) {
        currentPage = parseInt(activePageEl.innerText.trim(), 10) || 1;
      }
      const pageElements = Array.from(paginator.querySelectorAll('.ui-paginator-page, .p-paginator-page'));
      if (pageElements.length > 0) {
        const lastPageEl = pageElements[pageElements.length - 1];
        totalPages = parseInt(lastPageEl.innerText.trim(), 10) || 1;
      }
      totalRecordsText = paginator.innerText.replace(/\s+/g, ' ').trim();
    }

    const monthNames = {
      '01': '01 - Enero', '02': '02 - Febrero', '03': '03 - Marzo', '04': '04 - Abril',
      '05': '05 - Mayo', '06': '06 - Junio', '07': '07 - Julio', '08': '08 - Agosto',
      '09': '09 - Septiembre', '10': '10 - Octubre', '11': '11 - Noviembre', '12': '12 - Diciembre'
    };

    let xmlCount = 0;
    const rowDetails = rows.map((row, idx) => {
      const cells = row.querySelectorAll('td');

      // Extraer Razón Social (Columna 2)
      let razonSocial = 'Proveedor';
      if (cells.length > 1) {
        const cellText = cells[1].innerText.trim();
        const lines = cellText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
          razonSocial = lines.slice(1).join(' ');
        } else if (lines.length === 1) {
          const match = lines[0].match(/^\d{13}\s+(.*)$/);
          razonSocial = match ? match[1] : lines[0];
        }
      }

      // Extraer Tipo y Serie/Secuencial (Columna 3, ej: "Factura 006-001-000053319")
      let tipoSerie = '';
      let tipoComp = 'Factura';
      let numComp = '';
      if (cells.length > 2) {
        tipoSerie = cells[2].innerText.trim();
        const parts = tipoSerie.split(/\s+/);
        if (parts.length > 1) {
          tipoComp = parts[0];
          numComp = parts.slice(1).join(' ');
        } else {
          tipoComp = tipoSerie;
        }
      }

      // Extraer Clave de Acceso (49 dígitos)
      const claveMatch = row.innerText.match(/\b\d{49}\b/);
      const clave = claveMatch ? claveMatch[0] : '';

      // Extraer Fecha
      let formattedDate = 'Fecha';
      let year = String(new Date().getFullYear());
      let monthFolder = 'Mes';

      if (clave && clave.length >= 8) {
        const d = clave.substring(0, 2);
        const m = clave.substring(2, 4);
        const y = clave.substring(4, 8);
        formattedDate = `${y}-${m}-${d}`;
        year = y;
        monthFolder = monthNames[m] || `Mes_${m}`;
      } else {
        const dateMatch = row.innerText.match(/\b(\d{2})[/-](\d{2})[/-](\d{4})\b/);
        if (dateMatch) {
          formattedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
          year = dateMatch[3];
          monthFolder = monthNames[dateMatch[2]] || `Mes_${dateMatch[2]}`;
        }
      }

      const cleanRazon = razonSocial.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().substring(0, 60);
      const cleanSerie = tipoSerie.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
      let filename = `${formattedDate} - ${cleanRazon}`;
      if (cleanSerie) {
        filename += ` - ${cleanSerie}`;
      }
      filename += '.xml';

      const xmlBtn = row.querySelector('[title*="XML" i], [aria-label*="XML" i], a[href*=".xml" i], [class*="xml" i], img[src*="xml" i], a[href*="xml" i]');
      if (xmlBtn) xmlCount++;

      return {
        index: idx,
        fechaEmision: formattedDate,
        razonSocial: cleanRazon,
        tipoComprobante: tipoComp,
        numeroComprobante: numComp,
        tipoSerie: cleanSerie,
        claveAcceso: clave,
        year: year,
        month: monthFolder,
        filename: filename,
        hasXml: Boolean(xmlBtn)
      };
    });

    const url = window.location.href.toLowerCase();
    const bodySnippet = document.body ? document.body.innerText.substring(0, 1200).toLowerCase() : '';
    let category = 'Ventas';
    if (url.includes('recibido') || bodySnippet.includes('recibido') || bodySnippet.includes('compras')) {
      category = 'Compras';
    } else if (url.includes('emitido') || bodySnippet.includes('emitido') || bodySnippet.includes('ventas')) {
      category = 'Ventas';
    }

    return {
      hasTable: Boolean(mainTable),
      rowCount: rows.length,
      totalRowsOnPage: rows.length,
      rows: rowDetails,
      xmlCount,
      currentPage,
      totalPages,
      totalRecordsInfo: totalRecordsText,
      category: category
    };
  };

  return '(' + fn.toString() + ')();';
}

// Script para extraer metadata y hacer clic en el XML de una fila específica
function getClickRowXmlScript(rowIndex) {
  const fn = function(idx) {
    const tables = Array.from(document.querySelectorAll('p-table, table.ui-table, .ui-datatable-tablewrapper table, table'));
    let rows = [];

    for (const t of tables) {
      const foundRows = Array.from(t.querySelectorAll('tbody tr'));
      const validRows = foundRows.filter(r => !r.innerText.includes('No se encontraron') && r.querySelectorAll('td').length > 3);
      if (validRows.length > 0) {
        rows = validRows;
        break;
      }
    }

    if (idx < 0 || idx >= rows.length) {
      return { success: false, reason: 'Índice de fila fuera de rango: ' + idx, totalRows: rows.length };
    }

    const row = rows[idx];
    const cells = row.querySelectorAll('td');

    // 1. Extraer Razón Social (Columna 2 / cells[1])
    let razonSocial = 'Proveedor';
    if (cells.length > 1) {
      const cellText = cells[1].innerText.trim();
      const lines = cellText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        razonSocial = lines.slice(1).join(' ');
      } else if (lines.length === 1) {
        const match = lines[0].match(/^\d{13}\s+(.*)$/);
        razonSocial = match ? match[1] : lines[0];
      }
    }

    // 2. Extraer Tipo y Serie (Columna 3 / cells[2], ej: "Factura 001-003-000003838")
    let tipoSerie = '';
    if (cells.length > 2) {
      tipoSerie = cells[2].innerText.trim();
    }

    // 3. Extraer Clave de Acceso de 49 dígitos
    const claveMatch = row.innerText.match(/\b\d{49}\b/);
    const clave = claveMatch ? claveMatch[0] : null;

    // 4. Extraer Fecha (desde la clave ddmmaaaa o desde el texto de la fila)
    let formattedDate = 'Fecha';
    let year = String(new Date().getFullYear());
    let monthFolder = 'Mes';

    const monthNames = {
      '01': '01 - Enero', '02': '02 - Febrero', '03': '03 - Marzo', '04': '04 - Abril',
      '05': '05 - Mayo', '06': '06 - Junio', '07': '07 - Julio', '08': '08 - Agosto',
      '09': '09 - Septiembre', '10': '10 - Octubre', '11': '11 - Noviembre', '12': '12 - Diciembre'
    };

    if (clave && clave.length >= 8) {
      const d = clave.substring(0, 2);
      const m = clave.substring(2, 4);
      const y = clave.substring(4, 8);
      formattedDate = `${y}-${m}-${d}`;
      year = y;
      monthFolder = monthNames[m] || `Mes_${m}`;
    } else {
      const dateMatch = row.innerText.match(/\b(\d{2})[/-](\d{2})[/-](\d{4})\b/);
      if (dateMatch) {
        formattedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        year = dateMatch[3];
        monthFolder = monthNames[dateMatch[2]] || `Mes_${dateMatch[2]}`;
      }
    }

    // 5. Construir nombre descriptivo: [Fecha] - [Razón Social] - [Serie].xml
    const cleanRazon = razonSocial.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().substring(0, 60);
    const cleanSerie = tipoSerie.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
    
    let suggestedFilename = `${formattedDate} - ${cleanRazon}`;
    if (cleanSerie) {
      suggestedFilename += ` - ${cleanSerie}`;
    }
    suggestedFilename += '.xml';

    // 6. Encontrar botón o enlace XML
    const xmlEl = row.querySelector('[title*="XML" i], [aria-label*="XML" i], a[href*=".xml" i], [class*="xml" i], img[src*="xml" i], a[href*="xml" i]');
    if (!xmlEl) {
      return { success: false, reason: 'Botón XML no encontrado en la fila ' + (idx + 1), clave: clave };
    }

    const clickable = xmlEl.closest('a, button, span') || xmlEl;
    clickable.click();

    return {
      success: true,
      clave: clave,
      filename: suggestedFilename,
      year: year,
      month: monthFolder,
      rowIndex: idx,
      totalRows: rows.length
    };
  };

  return '(' + fn.toString() + ')(' + rowIndex + ');';
}

// Script optimizado para avanzar de página de forma reactiva
function getNextPageScript() {
  const fn = function() {
    return new Promise((resolve) => {
      const nextBtn = document.querySelector('.ui-paginator-next:not(.ui-state-disabled), .p-paginator-next:not(.p-disabled), button[aria-label="Next Page"]:not([disabled])');
      if (!nextBtn) {
        return resolve({ success: false, hasNextPage: false, message: 'No hay más páginas disponibles.' });
      }

      const firstRow = document.querySelector('tbody tr');
      const previousSignature = firstRow ? firstRow.innerText.trim().substring(0, 40) : '';

      nextBtn.click();

      let attempts = 0;
      const maxAttempts = 20;
      const poll = setInterval(() => {
        attempts++;
        const currentFirstRow = document.querySelector('tbody tr');
        const currentSignature = currentFirstRow ? currentFirstRow.innerText.trim().substring(0, 40) : '';

        if (currentSignature !== previousSignature || attempts >= maxAttempts) {
          clearInterval(poll);
          resolve({ success: true, hasNextPage: true, message: 'Página siguiente lista.' });
        }
      }, 50);
    });
  };

  return '(' + fn.toString() + ')();';
}

// Script para inspeccionar la tabla de reclamo de IVA (Discapacidad / Tercera Edad)
function getInspectDiscapacidadTableScript() {
  const fn = function() {
    function findDataRows(doc) {
      // 1. Búsqueda directa por ID de tabla PrimeFaces 'tblFacturas'
      const facturasBody = doc.querySelector('tbody[id*="tblFacturas"], [id*="tblFacturas"] tbody');
      if (facturasBody) {
        const trs = Array.from(facturasBody.querySelectorAll('tr')).filter(r => 
          !r.classList.contains('ui-datatable-empty-message') && r.querySelectorAll('td').length >= 4
        );
        if (trs.length > 0) return trs;
      }

      // 2. Búsqueda por encabezados representativos
      const allTables = Array.from(doc.querySelectorAll('table, .ui-datatable'));
      for (const tbl of allTables) {
        const text = (tbl.innerText || '').toLowerCase();
        if (text.includes('tipo de gasto') && (text.includes('iva solicitado') || text.includes('monto iva'))) {
          const trs = Array.from(tbl.querySelectorAll('tbody tr, tr')).filter(r => {
            if (r.closest('thead, tfoot')) return false;
            if (r.classList.contains('ui-datatable-empty-message')) return false;
            return r.querySelectorAll('td').length >= 4 && (r.querySelector('.ui-selectonemenu') || r.querySelector('select'));
          });
          if (trs.length > 0) return trs;
        }
      }

      // 3. Búsqueda de respaldo general
      const allTrs = Array.from(doc.querySelectorAll('tr'));
      return allTrs.filter(r => {
        if (r.closest('thead, tfoot')) return false;
        if (r.classList.contains('ui-datatable-empty-message')) return false;
        const tds = r.querySelectorAll('td');
        if (tds.length < 4) return false;

        const hasInput = Boolean(r.querySelector('input[type="text"], input:not([type="checkbox"]):not([type="hidden"])'));
        const hasSelect = Boolean(r.querySelector('select, .ui-selectonemenu'));
        const hasChk = Boolean(r.querySelector('input[type="checkbox"], .ui-chkbox'));
        const hasRide = (r.innerText || '').includes('RIDE');

        return (hasInput && (hasSelect || hasChk)) || (hasRide && tds.length >= 6);
      });
    }

    let rows = findDataRows(document);
    let targetDoc = document;

    if (rows.length === 0) {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      for (const ifr of iframes) {
        try {
          const doc = ifr.contentDocument || ifr.contentWindow.document;
          if (doc) {
            const ifrRows = findDataRows(doc);
            if (ifrRows.length > 0) {
              rows = ifrRows;
              targetDoc = doc;
              break;
            }
          }
        } catch (e) {}
      }
    }

    if (rows.length === 0) {
      const bodyTxt = (document.body ? document.body.innerText : '').toLowerCase();
      const hasHeader = bodyTxt.includes('iva solicitado') || bodyTxt.includes('monto iva');
      return {
        hasTable: hasHeader,
        rowCount: 0,
        rowsCount: 0,
        totalRows: 0,
        totalMontoIva: 0,
        totalIva: 0,
        tipoGastoOptions: [],
        message: 'No se detectaron comprobantes en la tabla de reclamo del SRI.'
      };
    }

    // Inspeccionar opciones de Tipo de Gasto del primer select
    const firstSelect = targetDoc.querySelector('tbody select, table select');
    const tipoGastoOptions = [];
    if (firstSelect && firstSelect.tagName === 'SELECT') {
      Array.from(firstSelect.options).forEach(opt => {
        const val = opt.value;
        const txt = (opt.textContent || '').trim();
        if (txt && !txt.toLowerCase().includes('seleccione')) {
          tipoGastoOptions.push({ value: val, label: txt });
        }
      });
    }

    // Identificar columna 'monto iva' si existen encabezados en la tabla
    const headers = Array.from(targetDoc.querySelectorAll('thead th, tr:first-child th'));
    let montoIvaColIdx = -1;
    headers.forEach((th, idx) => {
      const txt = (th.innerText || '').toLowerCase();
      if (txt.includes('monto iva') || (txt.includes('monto') && txt.includes('iva') && !txt.includes('solicitado'))) {
        montoIvaColIdx = idx;
      }
    });

    // Calcular suma de Monto IVA original
    let totalMontoIva = 0.0;
    rows.forEach(r => {
      const cells = Array.from(r.querySelectorAll('td'));
      let montoCell = (montoIvaColIdx >= 0 && cells[montoIvaColIdx]) ? cells[montoIvaColIdx] : null;

      if (!montoCell) {
        cells.forEach((c, idx) => {
          if (c.querySelector('input[type="text"], input:not([type="checkbox"]):not([type="hidden"])')) {
            if (idx > 0) montoCell = cells[idx - 1];
          }
        });
      }

      if (montoCell) {
        const num = parseFloat((montoCell.innerText || '').replace(',', '.').replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) totalMontoIva += num;
      }
    });

    return {
      hasTable: true,
      rowCount: rows.length,
      rowsCount: rows.length,
      totalRows: rows.length,
      totalMontoIva: parseFloat(totalMontoIva.toFixed(2)),
      totalIva: parseFloat(totalMontoIva.toFixed(2)),
      tipoGastoOptions: tipoGastoOptions
    };
  };

  return '(' + fn.toString() + ')();';
}

// Script para calcular y aplicar el IVA solicitado según porcentaje de discapacidad y tipo de gasto
function getApplyDiscapacidadIvaScript(config) {
  const fn = function(cfg) {
    const porcentaje = parseFloat(cfg.porcentaje) || 60;
    const factor = porcentaje / 100.0;
    const tipoGastoTarget = (cfg.tipoGasto || '').trim().toLowerCase();
    const shouldCheckAll = cfg.checkAll !== false;

    const tables = Array.from(document.querySelectorAll('table'));
    let targetTable = null;
    for (const tbl of tables) {
      const text = (tbl.innerText || '').toLowerCase();
      if (text.includes('iva solicitado') || (text.includes('monto iva') && text.includes('tipo de gasto'))) {
        targetTable = tbl;
        break;
      }
    }

    if (!targetTable) {
      const dt = document.querySelector('.p-datatable, .ui-datatable');
      if (dt) targetTable = dt.querySelector('table') || dt;
    }

    if (!targetTable) {
      return { success: false, error: 'No se encontró la tabla de comprobantes' };
    }

    const headers = Array.from(targetTable.querySelectorAll('thead th, thead td, tr:first-child th'));
    let colMontoIva = -1;
    let colIvaSolicitado = -1;
    let colTipoGasto = -1;
    let colSeleccionar = -1;

    headers.forEach((th, idx) => {
      const t = (th.innerText || '').toLowerCase();
      if (t.includes('monto iva') || (t.includes('monto') && t.includes('iva') && !t.includes('solicitado'))) {
        colMontoIva = idx;
      } else if (t.includes('iva solicitado') || t.includes('solicitado')) {
        colIvaSolicitado = idx;
      } else if (t.includes('tipo de gasto') || t.includes('gasto')) {
        colTipoGasto = idx;
      } else if (t.includes('seleccionar') || t.includes('selecc')) {
        colSeleccionar = idx;
      }
    });

    const rows = Array.from(targetTable.querySelectorAll('tbody tr')).filter(r => {
      return r.querySelectorAll('td').length >= 4 && !r.classList.contains('ui-datatable-empty-message');
    });

    let updatedCount = 0;
    let sumOriginal = 0.0;
    let sumCalculado = 0.0;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 0) return;

      let cellMonto = (colMontoIva >= 0 && cells[colMontoIva]) ? cells[colMontoIva] : null;
      let cellInput = (colIvaSolicitado >= 0 && cells[colIvaSolicitado]) ? cells[colIvaSolicitado] : null;
      let cellGasto = (colTipoGasto >= 0 && cells[colTipoGasto]) ? cells[colTipoGasto] : null;
      let cellCheck = (colSeleccionar >= 0 && cells[colSeleccionar]) ? cells[colSeleccionar] : null;

      if (!cellInput || !cellInput.querySelector('input[type="text"], input:not([type="checkbox"]):not([type="hidden"])')) {
        cells.forEach((c, idx) => {
          if (c.querySelector('input[type="text"], input:not([type="checkbox"]):not([type="hidden"])')) {
            cellInput = c;
            if (!cellMonto && idx > 0) cellMonto = cells[idx - 1];
          }
          if (c.querySelector('select')) {
            cellGasto = c;
          }
          if (c.querySelector('input[type="checkbox"]')) {
            cellCheck = c;
          }
        });
      }

      if (!cellMonto || !cellInput) return;

      const montoText = (cellMonto.innerText || cellMonto.textContent || '').replace(',', '.').replace(/[^0-9.]/g, '');
      const montoIvaNum = parseFloat(montoText);
      if (isNaN(montoIvaNum)) return;

      const rawCalculado = montoIvaNum * factor;
      const nuevoIvaSolicitado = (Math.round((rawCalculado + Number.EPSILON) * 100) / 100).toFixed(2);

      const inputEl = cellInput.querySelector('input[type="text"], input:not([type="checkbox"]):not([type="hidden"])');
      if (inputEl) {
        nativeSetter.call(inputEl, nuevoIvaSolicitado);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        inputEl.dispatchEvent(new Event('blur', { bubbles: true }));

        sumOriginal += montoIvaNum;
        sumCalculado += parseFloat(nuevoIvaSolicitado);
        updatedCount++;
      }

      // Marcar casilla de verificación primero para habilitar fila en SRI
      if (shouldCheckAll && cellCheck) {
        const chk = cellCheck.querySelector('input[type="checkbox"]');
        const primeBox = cellCheck.querySelector('.ui-chkbox-box');
        if (primeBox && !primeBox.classList.contains('ui-state-active')) {
          primeBox.click();
        } else if (chk && !chk.checked) {
          chk.click();
        }
        if (chk && !chk.checked) {
          chk.checked = true;
          chk.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      if (tipoGastoTarget && cellGasto) {
        const selectEl = cellGasto.querySelector('select');
        const menuEl = cellGasto.querySelector('.ui-selectonemenu');
        const labelEl = cellGasto.querySelector('.ui-selectonemenu-label, label');

        if (menuEl) {
          menuEl.classList.remove('ui-state-disabled');
          menuEl.removeAttribute('disabled');
        }
        if (selectEl) {
          selectEl.disabled = false;
          selectEl.removeAttribute('disabled');
        }
        if (labelEl) {
          labelEl.removeAttribute('disabled');
          labelEl.setAttribute('aria-disabled', 'false');
        }

        if (selectEl) {
          let matched = false;
          let matchedVal = null;
          let matchedLabel = '';
          Array.from(selectEl.options).forEach((opt, idx) => {
            const optText = (opt.textContent || '').toLowerCase().trim();
            const optVal = (opt.value || '').toLowerCase().trim();
            if (!matched && (optText.includes(tipoGastoTarget) || optVal.includes(tipoGastoTarget))) {
              selectEl.selectedIndex = idx;
              selectEl.value = opt.value;
              matchedVal = opt.value;
              matchedLabel = (opt.textContent || '').trim();
              matched = true;
            }
          });
          if (matched) {
            if (labelEl && matchedLabel) {
              labelEl.textContent = matchedLabel;
              labelEl.innerText = matchedLabel;
            }
            selectEl.dispatchEvent(new Event('input', { bubbles: true }));
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));

            try {
              if (window.PrimeFaces && typeof window.PrimeFaces.ab === 'function' && selectEl.id) {
                const baseId = selectEl.id.replace(/_input$/, '');
                window.PrimeFaces.ab({ s: baseId, e: 'change', f: 'j_idt164', p: baseId, ps: true });
              }
            } catch (e) {}
          }
        }
      }
    });

    return {
      success: true,
      rowCount: updatedCount,
      porcentaje: porcentaje,
      totalOriginal: parseFloat(sumOriginal.toFixed(2)),
      totalCalculado: parseFloat(sumCalculado.toFixed(2)),
      tipoGasto: cfg.tipoGasto || 'Mantener actual'
    };
  };

  return '(' + fn.toString() + ')(' + JSON.stringify(config || {}) + ');';
}

// Script para procesar una fila individual en la tabla de Reclamo Automático (Discapacidad / Tercera Edad)
function getProcessReclamoRowScript(rowIndex) {
  const fn = function(rIndex) {
    function findDataRows(doc) {
      // 1. Búsqueda directa por ID de tabla PrimeFaces 'tblFacturas'
      const facturasBody = doc.querySelector('tbody[id*="tblFacturas"], [id*="tblFacturas"] tbody');
      if (facturasBody) {
        const trs = Array.from(facturasBody.querySelectorAll('tr')).filter(r => 
          !r.classList.contains('ui-datatable-empty-message') && r.querySelectorAll('td').length >= 4
        );
        if (trs.length > 0) return trs;
      }

      // 2. Búsqueda por encabezados representativos
      const allTables = Array.from(doc.querySelectorAll('table, .ui-datatable'));
      for (const tbl of allTables) {
        const text = (tbl.innerText || '').toLowerCase();
        if (text.includes('tipo de gasto') && (text.includes('iva solicitado') || text.includes('monto iva'))) {
          const trs = Array.from(tbl.querySelectorAll('tbody tr, tr')).filter(r => {
            if (r.closest('thead, tfoot')) return false;
            if (r.classList.contains('ui-datatable-empty-message')) return false;
            return r.querySelectorAll('td').length >= 4 && (r.querySelector('.ui-selectonemenu') || r.querySelector('select'));
          });
          if (trs.length > 0) return trs;
        }
      }

      // 3. Búsqueda de respaldo general
      const allTrs = Array.from(doc.querySelectorAll('tr'));
      return allTrs.filter(r => {
        if (r.closest('thead, tfoot')) return false;
        if (r.classList.contains('ui-datatable-empty-message')) return false;
        const tds = r.querySelectorAll('td');
        if (tds.length < 4) return false;

        const hasInput = Boolean(r.querySelector('input[type="text"], input:not([type="checkbox"]):not([type="hidden"])'));
        const hasSelect = Boolean(r.querySelector('select, .ui-selectonemenu'));
        const hasChk = Boolean(r.querySelector('input[type="checkbox"], .ui-chkbox'));
        const hasRide = (r.innerText || '').includes('RIDE');

        return (hasInput && (hasSelect || hasChk)) || (hasRide && tds.length >= 6);
      });
    }

    let rows = findDataRows(document);
    let targetDoc = document;

    if (rows.length === 0) {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      for (const ifr of iframes) {
        try {
          const doc = ifr.contentDocument || ifr.contentWindow.document;
          if (doc) {
            const ifrRows = findDataRows(doc);
            if (ifrRows.length > 0) {
              rows = ifrRows;
              targetDoc = doc;
              break;
            }
          }
        } catch (e) {}
      }
    }

    if (rows.length === 0) {
      return { success: false, error: 'No se encontraron filas de comprobantes en la pantalla del SRI' };
    }

    if (rIndex < 0 || rIndex >= rows.length) {
      return { success: false, error: 'Índice de fila fuera de rango: ' + rIndex + ' (Total filas: ' + rows.length + ')' };
    }

    const row = rows[rIndex];
    const cells = Array.from(row.querySelectorAll('td'));
    const win = targetDoc.defaultView || window;

    // 1. Extraer Razón Social de la fila (buscar en celda 2 o celda de texto)
    let cellRazon = cells.length > 2 ? cells[2] : null;
    let razonSocial = (cellRazon ? (cellRazon.innerText || cellRazon.textContent) : '').trim();
    if (!razonSocial && cells.length > 1) {
      for (let i = 1; i < Math.min(cells.length, 5); i++) {
        const txt = (cells[i].innerText || cells[i].textContent || '').trim();
        if (txt && !/^\d{4}-\d{2}-\d{2}$/.test(txt) && !/^\d+(\.\d+)?$/.test(txt) && txt !== 'RIDE') {
          razonSocial = txt;
          cellRazon = cells[i];
          break;
        }
      }
    }

    // 2. Inferencia y normalización del tipo de gasto según razón social
    function norm(str) {
      return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    }

    function inferTipoGasto(name) {
      const n = (name || '').toLowerCase();
      if (/farmaci|fybeca|sana\s*sana|medifarm|hospital|clinic|medic|salud|drogueri|cruz\s*azul|laboratorio|optica|dental|odontolog|biomedic/i.test(n)) {
        return 'salud';
      }
      if (/colegio|escuela|universidad|instituto|academ|libreri|papeler|editorial|educaci|capacitaci/i.test(n)) {
        return 'educación';
      }
      if (/textil|confecci|ropa|calzado|zapater|boutique|moda|vestiment|deportiv|marathon|pinto/i.test(n)) {
        return 'vestimenta';
      }
      if (/inmobiliari|arriendo|alquiler|condominio|ferreter|electric|pintur|plomer|agua|luz|vivienda|constructor/i.test(n)) {
        return 'vivienda';
      }
      return 'alimentación';
    }

    const tipoGastoTarget = inferTipoGasto(razonSocial);
    const targetNorm = norm(tipoGastoTarget);

    // 3. PASO 1: VERIFICAR Y ASEGURAR QUE LA FILA ESTÁ ACTIVADA
    let cellCheck = null;
    for (const c of cells) {
      if (c.querySelector('input[type="checkbox"], .ui-chkbox')) {
        cellCheck = c;
        break;
      }
    }
    if (!cellCheck && cells.length > 8) cellCheck = cells[8];

    const chk = (cellCheck ? cellCheck.querySelector('input[type="checkbox"]') : null) || row.querySelector('input[type="checkbox"]');
    const primeBox = (cellCheck ? cellCheck.querySelector('.ui-chkbox-box') : null) || row.querySelector('.ui-chkbox-box');
    const primeIcon = (cellCheck ? cellCheck.querySelector('.ui-chkbox-icon') : null) || row.querySelector('.ui-chkbox-icon');

    const isCheckedInitial = (chk && chk.checked) || (primeBox && primeBox.classList.contains('ui-state-active'));
    if (!isCheckedInitial) {
      if (primeBox) {
        try {
          primeBox.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: win }));
          primeBox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: win }));
          primeBox.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: win }));
        } catch (e) {}
        primeBox.click();
      } else if (chk) {
        chk.click();
      }

      if (chk && !chk.checked) {
        chk.checked = true;
        chk.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (primeBox && !primeBox.classList.contains('ui-state-active')) {
        primeBox.classList.add('ui-state-active');
        if (primeIcon) {
          primeIcon.classList.remove('ui-icon-blank');
          primeIcon.classList.add('ui-icon-check');
        }
      }
    }

    // 4. PASO 2: COLOCAR PRIMERO EL MONTO DEL IVA SOLICITADO
    let montoIvaVal = '0.00';
    let cellMonto = null;
    let cellInput = null;

    for (let i = 0; i < cells.length; i++) {
      const inp = cells[i].querySelector('input[type="text"], input:not([type="checkbox"]):not([type="hidden"])');
      if (inp) {
        cellInput = cells[i];
        if (i > 0) cellMonto = cells[i - 1];
        break;
      }
    }
    if (!cellInput && cells.length > 6) cellInput = cells[6];
    if (!cellMonto && cells.length > 5) cellMonto = cells[5];

    if (cellMonto) {
      const rawText = (cellMonto.innerText || cellMonto.textContent || '').replace(',', '.').replace(/[^0-9.]/g, '');
      const parsed = parseFloat(rawText);
      if (!isNaN(parsed) && parsed > 0) {
        montoIvaVal = parsed.toFixed(2);
      }
    }

    const inputEl = (cellInput ? cellInput.querySelector('input[type="text"], input:not([type="checkbox"]):not([type="hidden"])') : null) || row.querySelector('input[type="text"]');
    if (inputEl) {
      const curVal = (inputEl.value || '').trim();
      const curNum = parseFloat(curVal.replace(',', '.'));

      if (!curVal || isNaN(curNum) || curNum === 0) {
        inputEl.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        if (setter) {
          setter.call(inputEl, montoIvaVal);
        } else {
          inputEl.value = montoIvaVal;
        }
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        inputEl.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }

    // 5. PASO 3: COLOCAR EL TIPO DE GASTO EN EL DESPLEGABLE
    let cellGasto = null;
    for (const c of cells) {
      if (c.querySelector('.ui-selectonemenu, select, [id*="cmbTipoGasto"]')) {
        cellGasto = c;
        break;
      }
    }
    if (!cellGasto && cells.length > 7) {
      cellGasto = cells[7];
    }

    const menu = targetDoc.querySelector('[id*="tblFacturas:' + rIndex + ':cmbTipoGasto"]:not([id*="_"])')
      || (cellGasto ? cellGasto.querySelector('.ui-selectonemenu') : null)
      || row.querySelector('.ui-selectonemenu');

    const selectEl = targetDoc.querySelector('[id*="tblFacturas:' + rIndex + ':cmbTipoGasto_input"]')
      || (cellGasto ? cellGasto.querySelector('select') : null)
      || row.querySelector('select');

    const labelEl = targetDoc.querySelector('[id*="tblFacturas:' + rIndex + ':cmbTipoGasto_label"]')
      || (cellGasto ? cellGasto.querySelector('.ui-selectonemenu-label, label') : null)
      || (menu ? menu.querySelector('.ui-selectonemenu-label, label') : null);

    const triggerEl = (menu ? menu.querySelector('.ui-selectonemenu-trigger') : null)
      || (cellGasto ? cellGasto.querySelector('.ui-selectonemenu-trigger') : null);

    let baseId = '';
    if (menu && menu.id) {
      baseId = menu.id;
    } else if (selectEl && selectEl.id) {
      baseId = selectEl.id.replace(/_input$/, '');
    } else if (labelEl && labelEl.id) {
      baseId = labelEl.id.replace(/_label$/, '');
    }

    const panelEl = (baseId ? targetDoc.getElementById(baseId + '_panel') : null)
      || targetDoc.querySelector('[id*="tblFacturas:' + rIndex + ':cmbTipoGasto_panel"], [id$=":' + rIndex + ':cmbTipoGasto_panel"]')
      || (cellGasto ? cellGasto.querySelector('.ui-selectonemenu-panel') : null);

    // Habilitar forzadamente en DOM cualquier estado deshabilitado que bloquee la selección
    if (menu) {
      menu.classList.remove('ui-state-disabled');
      menu.removeAttribute('disabled');
    }
    if (selectEl) {
      selectEl.disabled = false;
      selectEl.removeAttribute('disabled');
    }
    if (labelEl) {
      labelEl.removeAttribute('disabled');
      labelEl.setAttribute('aria-disabled', 'false');
    }

    // Mapeo dinámico de opciones según el HTML real del SRI (insensible a acentos/codificación)
    let matchedOption = null;
    let matchedVal = '';
    let matchedLabel = tipoGastoTarget;
    let matchedIndex = -1;

    if (selectEl && selectEl.options && selectEl.options.length > 0) {
      for (let i = 0; i < selectEl.options.length; i++) {
        const opt = selectEl.options[i];
        const optTxt = norm(opt.textContent || opt.text || '');
        const optVal = norm(opt.value || '');
        if (optTxt && !optTxt.includes('seleccione') && (optTxt.includes(targetNorm) || optVal.includes(targetNorm))) {
          matchedOption = opt;
          matchedVal = opt.value;
          matchedLabel = (opt.textContent || opt.text || '').trim();
          matchedIndex = i;
          break;
        }
      }
      // Fallback si no hubo coincidencia exacta (tomar la primera opción válida de gasto)
      if (!matchedOption && selectEl.options.length > 1) {
        for (let i = 1; i < selectEl.options.length; i++) {
          const opt = selectEl.options[i];
          const optTxt = norm(opt.textContent || opt.text || '');
          if (optTxt && !optTxt.includes('seleccione')) {
            matchedOption = opt;
            matchedVal = opt.value;
            matchedLabel = (opt.textContent || opt.text || '').trim();
            matchedIndex = i;
            break;
          }
        }
      }
    }

    // Localizar elemento <li> en el panel flotante
    let targetLi = null;
    if (panelEl) {
      const lis = Array.from(panelEl.querySelectorAll('li'));
      targetLi = lis.find(li => {
        const lbl = norm(li.getAttribute('data-label') || li.textContent || '');
        return lbl && !lbl.includes('seleccione') && lbl.includes(targetNorm);
      }) || lis.find(li => li.id && matchedIndex >= 0 && li.id.endsWith('_' + matchedIndex)) || (lis.length > 1 ? lis[1] : null);
    }
    if (!targetLi && baseId && matchedIndex >= 0) {
      targetLi = targetDoc.getElementById(baseId + '_' + matchedIndex)
        || targetDoc.querySelector('[id*="' + baseId + '_' + matchedIndex + '"]');
    }

    // Interacción con el widget PrimeFaces
    const jq = (win.PrimeFaces && win.PrimeFaces.$) || win.jQuery || win.$;
    let widget = null;
    try {
      const cleanWidgetVar = baseId ? 'widget_' + baseId.replace(/:/g, '_') : '';
      if (win.PF && cleanWidgetVar) {
        try { widget = win.PF(cleanWidgetVar) || win.PF(baseId); } catch (e) {}
      }
      if (!widget && win.PrimeFaces && win.PrimeFaces.widgets) {
        if (cleanWidgetVar && win.PrimeFaces.widgets[cleanWidgetVar]) widget = win.PrimeFaces.widgets[cleanWidgetVar];
        if (!widget && baseId && win.PrimeFaces.widgets[baseId]) widget = win.PrimeFaces.widgets[baseId];
        if (!widget && typeof win.PrimeFaces.getWidgetById === 'function' && baseId) {
          widget = win.PrimeFaces.getWidgetById(baseId);
        }
        if (!widget) {
          for (const k in win.PrimeFaces.widgets) {
            const w = win.PrimeFaces.widgets[k];
            if (w && (w.id === baseId || (w.jq && w.jq[0] === menu))) {
              widget = w;
              break;
            }
          }
        }
      }
      if (!widget && jq && menu) {
        widget = jq(menu).data('widget') || jq(menu).data('primefaces-widget');
      }
    } catch (e) {}

    // Disparar click en targetLi vía jQuery de PrimeFaces si está disponible
    if (targetLi) {
      if (jq) {
        try {
          jq(targetLi).trigger('mouseenter').trigger('mousedown').trigger('mouseup').trigger('click.ui-selectonemenu').trigger('click');
        } catch (e) {}
      }
      try {
        targetLi.click();
      } catch (e) {}
    }

    if (widget) {
      try {
        if (typeof widget.enable === 'function') {
          widget.enable();
        } else {
          widget.disabled = false;
        }
      } catch (e) {}

      try {
        if (targetLi && jq && typeof widget.selectItem === 'function') {
          widget.selectItem(jq(targetLi));
        }
      } catch (e) {}

      try {
        // En PrimeFaces, selectValue busca por data-label (ej. "alimentación"), no por valor numérico
        if (typeof widget.selectValue === 'function') {
          const success = widget.selectValue(matchedLabel);
          if (!success && matchedVal) {
            widget.selectValue(matchedVal);
          }
        }
      } catch (e) {}

      try {
        if (typeof widget.triggerChange === 'function') {
          widget.triggerChange();
        }
      } catch (e) {}

      try {
        if (typeof widget.hide === 'function') {
          widget.hide();
        }
      } catch (e) {}
    }

    // Actualización del <select> nativo
    if (selectEl && matchedIndex >= 0) {
      selectEl.selectedIndex = matchedIndex;
      if (matchedVal) selectEl.value = matchedVal;

      for (let i = 0; i < selectEl.options.length; i++) {
        selectEl.options[i].selected = (i === matchedIndex);
      }

      try {
        const s1 = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'selectedIndex').set;
        if (s1) s1.call(selectEl, matchedIndex);
      } catch (e) {}

      try {
        const s2 = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        if (s2) s2.call(selectEl, matchedVal);
      } catch (e) {}

      selectEl.dispatchEvent(new Event('input', { bubbles: true }));
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Disparar directamente el AJAX de PrimeFaces si el elemento tiene la directiva onchange
    try {
      if (win.PrimeFaces && typeof win.PrimeFaces.ab === 'function' && baseId) {
        const formEl = selectEl ? selectEl.closest('form') : (menu ? menu.closest('form') : null);
        const formId = formEl ? formEl.id : 'j_idt164';
        win.PrimeFaces.ab({
          s: baseId,
          e: 'change',
          f: formId,
          p: baseId,
          ps: true
        });
      }
    } catch (e) {}

    // Actualizar label visual y panel
    if (labelEl) {
      labelEl.textContent = matchedLabel;
      labelEl.innerText = matchedLabel;
    }

    if (panelEl) {
      const lis = Array.from(panelEl.querySelectorAll('li'));
      lis.forEach(li => li.classList.remove('ui-state-highlight', 'ui-state-hover'));
      if (targetLi) {
        targetLi.classList.add('ui-state-highlight');
      }
      panelEl.style.display = 'none';
      panelEl.classList.add('ui-helper-hidden');
    }

    // 6. PASO 4: RECONFIRMAR QUE LA CASILLA PERMANECE MARCADA
    if (chk && !chk.checked) {
      chk.checked = true;
      chk.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (primeBox && !primeBox.classList.contains('ui-state-active')) {
      primeBox.classList.add('ui-state-active');
      if (primeIcon) {
        primeIcon.classList.remove('ui-icon-blank');
        primeIcon.classList.add('ui-icon-check');
      }
    }

    return {
      success: true,
      index: rIndex,
      razonSocial: razonSocial || `Fila ${rIndex + 1}`,
      tipoGasto: matchedLabel,
      montoIva: montoIvaVal,
      debug: {
        rIndex: rIndex,
        totalRows: rows.length,
        cellsCount: cells.length,
        baseId: baseId,
        cellGastoFound: Boolean(cellGasto),
        menuFound: Boolean(menu),
        menuId: menu ? menu.id : null,
        selectFound: Boolean(selectEl),
        selectValue: selectEl ? selectEl.value : null,
        labelFound: Boolean(labelEl),
        labelText: labelEl ? labelEl.textContent : null,
        panelFound: Boolean(panelEl),
        targetLiFound: Boolean(targetLi),
        targetLiId: targetLi ? targetLi.id : null,
        widgetFound: Boolean(widget),
        cellGastoHtml: cellGasto ? cellGasto.innerHTML : null
      }
    };
  };

  return '(' + fn.toString() + ')(' + rowIndex + ');';
}

// Script para Fase 1: Activar y seleccionar todas las filas de la tabla de comprobantes
function getActivateAllReclamoRowsScript() {
  const fn = function() {
    function findDataRows(doc) {
      const facturasBody = doc.querySelector('tbody[id*="tblFacturas"], [id*="tblFacturas"] tbody');
      if (facturasBody) {
        const trs = Array.from(facturasBody.querySelectorAll('tr')).filter(r => 
          !r.classList.contains('ui-datatable-empty-message') && r.querySelectorAll('td').length >= 4
        );
        if (trs.length > 0) return trs;
      }
      const allTrs = Array.from(doc.querySelectorAll('tr'));
      return allTrs.filter(r => {
        if (r.closest('thead, tfoot')) return false;
        if (r.classList.contains('ui-datatable-empty-message')) return false;
        return r.querySelectorAll('td').length >= 4 && (r.querySelector('input[type="checkbox"]') || r.querySelector('.ui-chkbox'));
      });
    }

    let rows = findDataRows(document);
    let targetDoc = document;
    if (rows.length === 0) {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      for (const ifr of iframes) {
        try {
          const doc = ifr.contentDocument || ifr.contentWindow.document;
          if (doc) {
            const ifrRows = findDataRows(doc);
            if (ifrRows.length > 0) {
              rows = ifrRows;
              targetDoc = doc;
              break;
            }
          }
        } catch (e) {}
      }
    }

    const win = targetDoc.defaultView || window;
    let activatedCount = 0;

    // Activar cada fila de comprobante
    rows.forEach(row => {
      const chk = row.querySelector('input[type="checkbox"]');
      const primeBox = row.querySelector('.ui-chkbox-box');
      const primeIcon = row.querySelector('.ui-chkbox-icon');

      const isChecked = (chk && chk.checked) || (primeBox && primeBox.classList.contains('ui-state-active'));
      if (!isChecked) {
        if (primeBox) {
          try {
            primeBox.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: win }));
            primeBox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: win }));
            primeBox.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: win }));
          } catch (e) {}
          primeBox.click();
        } else if (chk) {
          chk.click();
        }

        if (chk && !chk.checked) {
          chk.checked = true;
          chk.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (primeBox && !primeBox.classList.contains('ui-state-active')) {
          primeBox.classList.add('ui-state-active');
          if (primeIcon) {
            primeIcon.classList.remove('ui-icon-blank');
            primeIcon.classList.add('ui-icon-check');
          }
        }
        activatedCount++;
      }
    });

    return {
      success: true,
      totalRows: rows.length,
      activatedCount: activatedCount
    };
  };

  return '(' + fn.toString() + ')();';
}

/**
 * Script para inspeccionar el estado actual de la pantalla de Declaración de IVA
 * Detecta si está en recibirDeclaracion.jsf, fase (periodo, preguntas, formulario),
 * y extrae el periodo seleccionado si está disponible.
 */
function getInspectDeclaracionPageScript() {
  const fn = function() {
    const url = window.location.href || '';
    const isDeclaracionPage = url.includes('recibirDeclaracion.jsf') || url.includes('declaraciones');
    if (!isDeclaracionPage) {
      return {
        isDeclaracionPage: false,
        phase: 'none',
        periodoTexto: null,
        year: null,
        month: null
      };
    }

    let phase = 'unknown';
    // Fase 1: Selección de período fiscal
    const somObligacion = document.querySelector('[id*="somObligacion"]');
    const calPeriodo = document.querySelector('[id*="calPeriodo"]');
    
    // Fase 2: Preguntas de perfilamiento
    const preguntas = document.querySelectorAll('[id*="pregunta"]');
    
    // Fase 3: Formulario interactivo
    const hasFormulario = document.querySelector('[id*="casillero"], [id*="panelFormulario"], .ui-accordion');

    let periodoTexto = null;
    let year = null;
    let month = null;

    if (calPeriodo) {
      periodoTexto = calPeriodo.innerText || calPeriodo.value || '';
      // Intentar extraer año de 4 dígitos
      const yMatch = periodoTexto.match(/\b(20\d{2})\b/);
      if (yMatch) year = yMatch[1];
      // Intentar extraer mes numérico o por nombre
      const mMatch = periodoTexto.match(/\b(0?[1-9]|1[0-2])\b/);
      if (mMatch) month = mMatch[1].padStart(2, '0');
    }

    if (preguntas.length > 5) {
      phase = 'preguntas';
    } else if (hasFormulario && !calPeriodo) {
      phase = 'formulario';
    } else if (calPeriodo || somObligacion) {
      phase = 'periodo';
    }

    return {
      isDeclaracionPage: true,
      phase,
      periodoTexto,
      year,
      month,
      hasPreguntas: preguntas.length > 0,
      hasFormulario: Boolean(hasFormulario)
    };
  };

  return '(' + fn.toString() + ')();';
}

/**
 * Script para rellenar automáticamente las preguntas de perfilamiento (Fase 2)
 */
function getFillDeclaracionProfilingScript(respuestas = {}) {
  const payload = JSON.stringify(respuestas);
  const fn = function(dataStr) {
    const data = JSON.parse(dataStr);
    let filledCount = 0;

    // Recorrer las preguntas de pregunta0 a pregunta11
    for (let i = 0; i <= 11; i++) {
      const qKey = 'pregunta' + i;
      const targetVal = (data[qKey] || 'No').toLowerCase(); // 'si' o 'no'

      // Buscar el contenedor de la pregunta
      const container = document.querySelector('[id$="' + qKey + '"], [id*="' + qKey + '_"]');
      if (!container) continue;

      // Buscar opciones Sí y No dentro del contenedor
      const radioBoxes = container.querySelectorAll('.ui-radiobutton');
      for (const rBox of radioBoxes) {
        const label = rBox.parentElement ? rBox.parentElement.querySelector('label') : null;
        const labelText = label ? label.innerText.trim().toLowerCase() : '';
        const input = rBox.querySelector('input[type="radio"]');

        const isSi = labelText === 'sí' || labelText === 'si' || (input && (input.value === '0' || input.value === 'true'));
        const isNo = labelText === 'no' || (input && (input.value === '1' || input.value === 'false'));

        if ((targetVal === 'si' && isSi) || (targetVal === 'no' && isNo)) {
          const clickTarget = rBox.querySelector('.ui-radiobutton-box') || input || rBox;
          if (clickTarget) {
            clickTarget.click();
            if (input) {
              input.checked = true;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            filledCount++;
          }
          break;
        }
      }
    }

    return {
      success: true,
      filledCount: filledCount
    };
  };

  return '(' + fn.toString() + ')(' + JSON.stringify(payload) + ');';
}

/**
 * Script para rellenar los casilleros del formulario interactivo (Fase 3)
 */
function getFillDeclaracionCasillerosScript(casilleros = {}) {
  const payload = JSON.stringify(casilleros);
  const fn = function(dataStr) {
    const data = JSON.parse(dataStr);
    let filledCasilleros = 0;

    // Desplegar todos los acordeones si están colapsados
    const accordionHeaders = document.querySelectorAll('.ui-accordion-header:not(.ui-state-active)');
    for (const h of accordionHeaders) {
      h.click();
    }

    // Buscar inputs que coincidan con los números de casilleros
    for (const [key, rawVal] of Object.entries(data)) {
      if (rawVal === undefined || rawVal === null) continue;
      const casilleroNum = key.replace(/\D/g, '');
      if (!casilleroNum) continue;

      const valStr = typeof rawVal === 'number' ? rawVal.toFixed(2) : String(rawVal);

      // Estrategias para encontrar el input del casillero:
      // 1. Por ID directo que termine o contenga el número de casillero
      let input = document.querySelector(
        'input[id$="casillero' + casilleroNum + '"], ' +
        'input[id$="' + casilleroNum + '"], ' +
        'input[id*="casillero' + casilleroNum + '_input"], ' +
        'input[name*="' + casilleroNum + '"]'
      );

      // 2. Si no por ID, buscar label con el número de casillero y tomar el input hermano/asociado
      if (!input) {
        const labels = Array.from(document.querySelectorAll('label, td, span')).filter(el => {
          const txt = el.innerText ? el.innerText.trim() : '';
          return txt === casilleroNum || txt.startsWith(casilleroNum + ' ');
        });
        for (const l of labels) {
          const parentRow = l.closest('tr, div.ui-g');
          if (parentRow) {
            const foundInput = parentRow.querySelector('input[type="text"], input:not([type="hidden"])');
            if (foundInput && !foundInput.disabled && !foundInput.readOnly) {
              input = foundInput;
              break;
            }
          }
        }
      }

      if (input && !input.disabled && !input.readOnly) {
        input.focus();
        input.value = valStr;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        filledCasilleros++;
      }
    }

    return {
      success: true,
      filledCasilleros
    };
  };

  return '(' + fn.toString() + ')(' + JSON.stringify(payload) + ');';
}

// Script para navegar de forma segura y autenticada entre secciones del SRI
function getNavigateToSriSectionScript(target = 'compras') {
  const fn = function(section) {
    const targets = {
      compras: {
        url: 'https://srienlinea.sri.gob.ec/tuportal-internet/accederAplicacion.jspa?redireccion=57&idGrupo=55',
        selector: 'a[href*="redireccion=57"]',
        headerText: 'FACTURACIÓN ELECTRÓNICA'
      },
      ventas: {
        url: 'https://srienlinea.sri.gob.ec/tuportal-internet/accederAplicacion.jspa?redireccion=60&idGrupo=58',
        selector: 'a[href*="redireccion=60"]',
        headerText: 'FACTURACIÓN ELECTRÓNICA',
        subText: 'Producción'
      },
      declaracion: {
        url: 'https://srienlinea.sri.gob.ec/sri-declaraciones-web-internet/pages/recepcion/recibirDeclaracion.jsf?identificadorGrupoObligacion=IVA',
        selector: 'a[href*="recibirDeclaracion.jsf"], a[href*="declaracion"]',
        headerText: 'DECLARACIONES'
      }
    };

    const cfg = targets[section] || targets.compras;

    try {
      // 1. Si estamos en el portal Angular (sri-en-linea)
      const isAngular = window.location.href.includes('/sri-en-linea');
      if (isAngular) {
        // A) Buscar si el enlace directo ya esta visible en el DOM
        let link = document.querySelector(cfg.selector);
        if (link) {
          link.click();
          return { success: true, method: 'dom_direct_click', section };
        }

        // B) Si el menu lateral esta contraido, abrirlo con el boton de hamburguesa
        const menuContraido = document.getElementById('sri-menu-contraido');
        if (menuContraido && menuContraido.offsetParent !== null) {
          const btnMenu = document.getElementById('sri-menu-desplegado-btn');
          if (btnMenu) btnMenu.click();
        }

        // C) Desplegar encabezado del grupo (ej. FACTURACION ELECTRONICA)
        if (cfg.headerText) {
          const headers = Array.from(document.querySelectorAll('a.ui-panelmenu-header-link, .ui-panelmenu-header a, .ui-panelmenu-header'));
          const targetHeader = headers.find(h => (h.innerText || '').toUpperCase().includes(cfg.headerText.toUpperCase()));
          if (targetHeader) {
            targetHeader.click();
          }
        }

        // D) Si requiere subgrupo (ej. Produccion para ventas)
        if (cfg.subText) {
          const menuLinks = Array.from(document.querySelectorAll('.ui-menuitem-link, a'));
          const subLink = menuLinks.find(el => (el.innerText || '').trim().toLowerCase() === cfg.subText.toLowerCase());
          if (subLink) {
            subLink.click();
          }
        }

        // E) Reintentar clic en el enlace tras abrir el arbol
        link = document.querySelector(cfg.selector);
        if (link) {
          link.click();
          return { success: true, method: 'dom_expanded_click', section };
        }
      }

      // 2. Si no es Angular o no se encontro el elemento, navegar mediante SSO router en ventana autenticada
      window.location.href = cfg.url;
      return { success: true, method: 'window_location', url: cfg.url };
    } catch (e) {
      window.location.href = cfg.url;
      return { success: true, method: 'fallback_location', error: e.message };
    }
  };

  return '(' + fn.toString() + ')(' + JSON.stringify(target) + ');';
}

module.exports = {
  getLoginScript,
  getPasswordCaptureScript,
  getInspectComprobantesScript,
  getClickRowXmlScript,
  getNextPageScript,
  getInspectDiscapacidadTableScript,
  getApplyDiscapacidadIvaScript,
  getActivateAllReclamoRowsScript,
  getProcessReclamoRowScript,
  getInspectDeclaracionPageScript,
  getFillDeclaracionProfilingScript,
  getFillDeclaracionCasillerosScript,
  getNavigateToSriSectionScript
};
