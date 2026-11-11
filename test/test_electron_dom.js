const { app, BrowserWindow } = require('electron');
const sriAutomation = require('../src/injected/sriAutomation');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: false } });

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body>
      <table id="j_idt164:tblFacturas">
        <tbody id="j_idt164:tblFacturas_data">
          <!-- Fila 0: TUTI (Alimentación) -->
          <tr data-ri="0" class="ui-widget-content">
            <td>1</td>
            <td><a href="#">RIDE</a></td>
            <td>TIENDAS TUTI TTDE S.A.</td>
            <td>Factura - 036-023-000002151</td>
            <td>2025-04-01</td>
            <td>1.02</td>
            <td><input type="text" class="iva-input" value=""></td>
            <td>
              <div class="ui-selectonemenu ui-widget ui-state-default ui-corner-all">
                <div class="ui-helper-hidden-accessible">
                  <select tabindex="-1">
                    <option value="">Seleccione</option>
                    <option value="1">alimentación</option>
                    <option value="2">educación</option>
                    <option value="3">salud</option>
                    <option value="4">vestimenta</option>
                    <option value="5">vivienda</option>
                  </select>
                </div>
                <label class="ui-selectonemenu-label ui-inputfield ui-corner-all">Seleccione</label>
                <div class="ui-selectonemenu-trigger ui-state-default ui-corner-right"><span class="ui-icon ui-icon-triangle-1-s"></span></div>
              </div>
            </td>
            <td>
              <div class="ui-chkbox ui-widget">
                <div class="ui-chkbox-box ui-widget ui-corner-all ui-state-default"><span class="ui-chkbox-icon ui-icon ui-icon-blank"></span></div>
                <input type="checkbox">
              </div>
            </td>
          </tr>
          <!-- Fila 1: FARMACIAS MIA (Salud) -->
          <tr data-ri="1" class="ui-widget-content">
            <td>2</td>
            <td><a href="#">RIDE</a></td>
            <td>CRESIO CIA. LTDA. FARMACIAS MIA MH001</td>
            <td>Factura - 036-023-000002152</td>
            <td>2025-04-02</td>
            <td>3.50</td>
            <td><input type="text" class="iva-input" value=""></td>
            <td>
              <div class="ui-selectonemenu ui-widget ui-state-default ui-corner-all">
                <div class="ui-helper-hidden-accessible">
                  <select tabindex="-1">
                    <option value="">Seleccione</option>
                    <option value="1">alimentación</option>
                    <option value="2">educación</option>
                    <option value="3">salud</option>
                    <option value="4">vestimenta</option>
                    <option value="5">vivienda</option>
                  </select>
                </div>
                <label class="ui-selectonemenu-label ui-inputfield ui-corner-all">Seleccione</label>
                <div class="ui-selectonemenu-trigger ui-state-default ui-corner-right"><span class="ui-icon ui-icon-triangle-1-s"></span></div>
              </div>
            </td>
            <td>
              <div class="ui-chkbox ui-widget">
                <div class="ui-chkbox-box ui-widget ui-corner-all ui-state-default"><span class="ui-chkbox-icon ui-icon ui-icon-blank"></span></div>
                <input type="checkbox">
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div id="j_idt164:tblFacturas:0:cmbTipoGasto_panel" class="ui-selectonemenu-panel ui-widget ui-widget-content ui-corner-all ui-helper-hidden ui-shadow ui-input-overlay" style="display: none;">
        <div class="ui-selectonemenu-items-wrapper" style="max-height:200px">
          <ul id="j_idt164:tblFacturas:0:cmbTipoGasto_items" class="ui-selectonemenu-items ui-selectonemenu-list ui-widget-content ui-widget ui-corner-all ui-helper-reset" role="listbox" aria-activedescendant="j_idt164:tblFacturas:0:cmbTipoGasto_0">
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all ui-state-highlight" data-label="Seleccione" id="j_idt164:tblFacturas:0:cmbTipoGasto_0">Seleccione</li>
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all" data-label="alimentación" id="j_idt164:tblFacturas:0:cmbTipoGasto_1">alimentación</li>
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all" data-label="educación" id="j_idt164:tblFacturas:0:cmbTipoGasto_2">educación</li>
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all" data-label="salud" id="j_idt164:tblFacturas:0:cmbTipoGasto_3">salud</li>
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all" data-label="vestimenta" id="j_idt164:tblFacturas:0:cmbTipoGasto_4">vestimenta</li>
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all" data-label="vivienda" id="j_idt164:tblFacturas:0:cmbTipoGasto_5">vivienda</li>
          </ul>
        </div>
      </div>
      <div id="j_idt164:tblFacturas:1:cmbTipoGasto_panel" class="ui-selectonemenu-panel ui-widget ui-widget-content ui-corner-all ui-helper-hidden ui-shadow ui-input-overlay" style="display: none;">
        <div class="ui-selectonemenu-items-wrapper" style="max-height:200px">
          <ul id="j_idt164:tblFacturas:1:cmbTipoGasto_items" class="ui-selectonemenu-items ui-selectonemenu-list ui-widget-content ui-widget ui-corner-all ui-helper-reset" role="listbox" aria-activedescendant="j_idt164:tblFacturas:1:cmbTipoGasto_0">
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all ui-state-highlight" data-label="Seleccione" id="j_idt164:tblFacturas:1:cmbTipoGasto_0">Seleccione</li>
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all" data-label="alimentación" id="j_idt164:tblFacturas:1:cmbTipoGasto_1">alimentación</li>
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all" data-label="educación" id="j_idt164:tblFacturas:1:cmbTipoGasto_2">educación</li>
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all" data-label="salud" id="j_idt164:tblFacturas:1:cmbTipoGasto_3">salud</li>
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all" data-label="vestimenta" id="j_idt164:tblFacturas:1:cmbTipoGasto_4">vestimenta</li>
            <li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all" data-label="vivienda" id="j_idt164:tblFacturas:1:cmbTipoGasto_5">vivienda</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

  // Inject a mock PrimeFaces and jQuery
  await win.webContents.executeJavaScript(`
    window.$ = function(selector) {
      const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      return {
        0: el,
        length: el ? 1 : 0,
        trigger: function(evt) { return this; },
        val: function(v) { if (v !== undefined && el) el.value = v; return el ? el.value : ''; },
        eq: function() { return this; }
      };
    };
    window.PrimeFaces = {
      widgets: {
        'j_idt164:tblFacturas:0:cmbTipoGasto': {
          id: 'j_idt164:tblFacturas:0:cmbTipoGasto',
          show: function() { throw new Error('Simulated PrimeFaces show error: this.items is undefined'); },
          selectItem: function() { throw new Error('Simulated selectItem error'); },
          selectValue: function() { throw new Error('Simulated selectValue error'); },
          triggerChange: function() {}
        }
      },
      getWidgetById: function(id) { return this.widgets[id] || null; }
    };
    true;
  `);

  // Run the inspect script
  const inspectScript = sriAutomation.getInspectDiscapacidadTableScript();
  const inspectRes = await win.webContents.executeJavaScript(inspectScript);
  console.log('Inspect Result:', inspectRes);

  // Process row 0 (TUTI -> alimentación)
  const script0 = sriAutomation.getProcessReclamoRowScript(0);
  const res0 = await win.webContents.executeJavaScript(script0);
  console.log('Row 0 Result:', res0);

  // Process row 1 (FARMACIAS MIA -> salud)
  const script1 = sriAutomation.getProcessReclamoRowScript(1);
  const res1 = await win.webContents.executeJavaScript(script1);
  console.log('Row 1 Result:', res1);

  // Check the DOM state for both rows
  const domState = await win.webContents.executeJavaScript(`
    const rows = document.querySelectorAll('tbody tr');
    Array.from(rows).map((r, i) => ({
      rowIndex: i,
      merchant: r.querySelectorAll('td')[2].innerText.trim(),
      labelText: r.querySelector('.ui-selectonemenu-label').textContent,
      selectValue: r.querySelector('select').value,
      selectIndex: r.querySelector('select').selectedIndex,
      ivaValue: r.querySelector('input.iva-input').value,
      checked: r.querySelector('input[type="checkbox"]').checked,
      boxActive: r.querySelector('.ui-chkbox-box').classList.contains('ui-state-active')
    }))
  `);

  console.log('DOM State after scripts:', JSON.stringify(domState, null, 2));

  // Assertions
  const assert = require('assert');
  assert.strictEqual(domState[0].merchant, 'TIENDAS TUTI TTDE S.A.', 'Razón social fila 0 debe mantenerse intacta');
  assert.strictEqual(domState[0].labelText, 'alimentación', 'Tipo de gasto fila 0 debe ser alimentación');
  assert.strictEqual(domState[0].ivaValue, '1.02', 'IVA solicitado fila 0 debe ser 1.02');
  assert.strictEqual(domState[0].checked, true, 'Checkbox fila 0 debe estar marcado');

  assert.strictEqual(domState[1].merchant, 'CRESIO CIA. LTDA. FARMACIAS MIA MH001', 'Razón social fila 1 debe mantenerse intacta');
  assert.strictEqual(domState[1].labelText, 'salud', 'Tipo de gasto fila 1 debe ser salud');
  assert.strictEqual(domState[1].ivaValue, '3.50', 'IVA solicitado fila 1 debe ser 3.50');
  assert.strictEqual(domState[1].checked, true, 'Checkbox fila 1 debe estar marcado');

  console.log('[OK] Todas las validaciones de DOM y PrimeFaces pasaron al 100%');
  app.quit();
});
