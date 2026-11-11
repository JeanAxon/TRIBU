import sys
import os
from playwright.sync_api import sync_playwright

html_content = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SRI Reclamo Devolución IVA Simulación</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #002699; color: white; }
    .ui-chkbox-box { width: 18px; height: 18px; border: 1px solid #999; display: inline-block; cursor: pointer; }
    .ui-chkbox-box.ui-state-active { background: #2563eb; }
    .ui-chkbox-icon.ui-icon-check { display: block; color: white; text-align: center; font-size: 14px; }
    .ui-selectonemenu { border: 1px solid #aaa; padding: 4px; display: inline-block; width: 160px; }
    .ui-selectonemenu-label { display: block; }
    .ui-helper-hidden-accessible { display: none; }
  </style>
</head>
<body>
  <h2>Portal SRI - Devolución de IVA</h2>
  <form id="j_idt164">
    <table id="tblFacturas">
      <thead>
        <tr>
          <th>Fecha de emisión</th>
          <th>RUC Proveedor</th>
          <th>Razón Social</th>
          <th>Tipo Serie</th>
          <th>Número</th>
          <th>Monto IVA (USD)</th>
          <th>IVA solicitado (USD)</th>
          <th>Tipo de gasto</th>
          <th>Seleccionar</th>
        </tr>
      </thead>
      <tbody id="tblFacturas_data">
        <tr id="row_0">
          <td>2025-03-21</td>
          <td>1791234567001</td>
          <td>TIENDAS TUTI TTDE S.A.</td>
          <td>Factura</td>
          <td>001-001-00000001</td>
          <td>0.80</td>
          <td><input type="text" id="j_idt164:tblFacturas:0:txtIva" value="" style="width: 70px;"></td>
          <td>
            <div id="j_idt164:tblFacturas:0:cmbTipoGasto" class="ui-selectonemenu">
              <div class="ui-helper-hidden-accessible">
                <select id="j_idt164:tblFacturas:0:cmbTipoGasto_input">
                  <option value="">Seleccione</option>
                  <option value="4">alimentación</option>
                  <option value="5">educación</option>
                  <option value="3">salud</option>
                  <option value="1">vestimenta</option>
                  <option value="2">vivienda</option>
                </select>
              </div>
              <span id="j_idt164:tblFacturas:0:cmbTipoGasto_label" class="ui-selectonemenu-label">Seleccione</span>
            </div>
          </td>
          <td>
            <div class="ui-chkbox">
              <div class="ui-helper-hidden-accessible"><input type="checkbox" id="j_idt164:tblFacturas:0:chk"></div>
              <div class="ui-chkbox-box"><span class="ui-chkbox-icon ui-icon-blank"></span></div>
            </div>
          </td>
        </tr>
        <tr id="row_1">
          <td>2025-03-22</td>
          <td>1799876543001</td>
          <td>FARMACIAS CRUZ AZUL - MEDIFARM S.A.</td>
          <td>Factura</td>
          <td>001-001-00000002</td>
          <td>0.13</td>
          <td><input type="text" id="j_idt164:tblFacturas:1:txtIva" value="" style="width: 70px;"></td>
          <td>
            <div id="j_idt164:tblFacturas:1:cmbTipoGasto" class="ui-selectonemenu">
              <div class="ui-helper-hidden-accessible">
                <select id="j_idt164:tblFacturas:1:cmbTipoGasto_input">
                  <option value="">Seleccione</option>
                  <option value="4">alimentación</option>
                  <option value="5">educación</option>
                  <option value="3">salud</option>
                  <option value="1">vestimenta</option>
                  <option value="2">vivienda</option>
                </select>
              </div>
              <span id="j_idt164:tblFacturas:1:cmbTipoGasto_label" class="ui-selectonemenu-label">Seleccione</span>
            </div>
          </td>
          <td>
            <div class="ui-chkbox">
              <div class="ui-helper-hidden-accessible"><input type="checkbox" id="j_idt164:tblFacturas:1:chk"></div>
              <div class="ui-chkbox-box"><span class="ui-chkbox-icon ui-icon-blank"></span></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </form>
</body>
</html>
"""

temp_html_path = os.path.abspath("test/temp_sri_reclamo.html")
with open(temp_html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(f"file:///{temp_html_path.replace(os.sep, '/')}")

    # Read the injected sriAutomation scripts
    import subprocess
    node_script = """
    const sri = require('./src/injected/sriAutomation.js');
    console.log(JSON.stringify({
      activateAll: sri.getActivateAllReclamoRowsScript(),
      row0: sri.getProcessReclamoRowScript(0),
      row1: sri.getProcessReclamoRowScript(1)
    }));
    """
    res = subprocess.check_output(["node", "-e", node_script], cwd=os.getcwd()).decode('utf-8')
    import json
    scripts = json.loads(res)

    print("--- [FASE 1]: Ejecutando activación de todas las filas ---")
    act_res = page.evaluate(scripts["activateAll"])
    print("Resultado Fase 1:", act_res)
    assert act_res["success"] is True
    assert act_res["activatedCount"] == 2

    # Verify both checkboxes are checked
    chk0 = page.eval_on_selector("#j_idt164\\:tblFacturas\\:0\\:chk", "el => el.checked")
    chk1 = page.eval_on_selector("#j_idt164\\:tblFacturas\\:1\\:chk", "el => el.checked")
    print(f"Checkboxes post Fase 1: Fila 0={chk0}, Fila 1={chk1}")
    assert chk0 is True and chk1 is True

    print("--- [FASE 2]: Procesando comprobante por comprobante (Monto y Tipo de Gasto) ---")
    res0 = page.evaluate(scripts["row0"])
    print("Fila 0 procesada:", res0["razonSocial"], "->", res0["tipoGasto"], "IVA:", res0["montoIva"])
    assert res0["success"] is True
    assert res0["tipoGasto"] == "alimentación"
    assert res0["montoIva"] == "0.80"

    res1 = page.evaluate(scripts["row1"])
    print("Fila 1 procesada:", res1["razonSocial"], "->", res1["tipoGasto"], "IVA:", res1["montoIva"])
    assert res1["success"] is True
    assert res1["tipoGasto"] == "salud"
    assert res1["montoIva"] == "0.13"

    # Final DOM check
    dom_summary = page.evaluate("""() => {
      return [0, 1].map(i => ({
        index: i,
        ivaVal: document.getElementById(`j_idt164:tblFacturas:${i}:txtIva`).value,
        selectVal: document.getElementById(`j_idt164:tblFacturas:${i}:cmbTipoGasto_input`).value,
        labelText: document.getElementById(`j_idt164:tblFacturas:${i}:cmbTipoGasto_label`).textContent,
        checked: document.getElementById(`j_idt164:tblFacturas:${i}:chk`).checked
      }));
    }""")
    print("Resumen final en DOM:", dom_summary)
    assert dom_summary[0]["ivaVal"] == "0.80"
    assert dom_summary[0]["labelText"] == "alimentación"
    assert dom_summary[0]["selectVal"] == "4"
    assert dom_summary[0]["checked"] is True

    assert dom_summary[1]["ivaVal"] == "0.13"
    assert dom_summary[1]["labelText"] == "salud"
    assert dom_summary[1]["selectVal"] == "3"
    assert dom_summary[1]["checked"] is True

    # Take screenshot as verification artifact
    screenshot_path = os.path.abspath("test/sri_reclamo_verified.png")
    page.screenshot(path=screenshot_path)
    print("Screenshot guardado en:", screenshot_path)

    browser.close()

if os.path.exists(temp_html_path):
    os.remove(temp_html_path)

print("[SUCCESS] Verificación de dos fases con Playwright completada satisfactoriamente.")
