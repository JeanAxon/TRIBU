/**
 * Módulo Frontend: Visor XML & Generador de ATS
 * TRIBU - Asistente Contable SRI Ecuador
 * 
 * Gestiona de manera autónoma:
 * - Selección de filtros (Tipo, Año, Mes)
 * - Carga y parseo de comprobantes electrónicos
 * - Renderizado de tabla interactiva y actualización de KPIs
 * - Edición en vivo de Códigos de Sustento Tributario
 * - Generación de archivo oficial XML del ATS
 * - Exportación de resúmenes a Excel (CSV)
 */

class AtsModuleView {
  constructor(options = {}) {
    this.api = options.api || (typeof window !== 'undefined' ? window.tribuApi : null);
    this.getActiveClient = options.getActiveClient || (() => null);
    this.showBanner = options.showBanner || console.log;

    this.state = {
      category: 'Compras',
      year: '',
      month: '',
      items: [],
      totals: { count: 0, base0: 0, baseGravada: 0, montoIva: 0, total: 0 },
      lastGeneratedFolder: null
    };

    this._cacheElements();
    this._bindEvents();
  }

  _cacheElements() {
    this.container = document.getElementById('clientAtsContainer');
    this.filterCategory = document.getElementById('atsFilterCategory');
    this.filterYear = document.getElementById('atsFilterYear');
    this.filterMonth = document.getElementById('atsFilterMonth');

    this.btnLoadPeriodXmls = document.getElementById('btnLoadPeriodXmls');
    this.btnOpenCurrentPeriodFolder = document.getElementById('btnOpenCurrentPeriodFolder');
    this.btnExportCsv = document.getElementById('btnExportCsv');
    this.btnGenerateAtsXml = document.getElementById('btnGenerateAtsXml');

    // KPIs
    this.kpiCount = document.getElementById('kpiCount');
    this.kpiBase0 = document.getElementById('kpiBase0');
    this.kpiBaseGrav = document.getElementById('kpiBaseGrav');
    this.kpiMontoIva = document.getElementById('kpiMontoIva');
    this.kpiTotal = document.getElementById('kpiTotal');

    // Tabla y Footer
    this.tableBody = document.getElementById('atsTableBody');
    this.tableFoot = document.getElementById('atsTableFoot');
    this.footBase0 = document.getElementById('footBase0');
    this.footBaseGrav = document.getElementById('footBaseGrav');
    this.footMontoIva = document.getElementById('footMontoIva');
    this.footTotal = document.getElementById('footTotal');

    // Modal de ATS Generado
    this.atsSuccessModal = document.getElementById('atsSuccessModal');
    this.atsGeneratedFileName = document.getElementById('atsGeneratedFileName');
    this.atsGeneratedCount = document.getElementById('atsGeneratedCount');
    this.atsGeneratedFilePath = document.getElementById('atsGeneratedFilePath');
    this.btnOpenAtsFolder = document.getElementById('btnOpenAtsFolder');
    this.btnAcceptAtsModal = document.getElementById('btnAcceptAtsModal');
    this.btnCloseAtsModal = document.getElementById('btnCloseAtsModal');
  }

  _bindEvents() {
    if (this.btnLoadPeriodXmls) {
      this.btnLoadPeriodXmls.addEventListener('click', () => this.refreshAndLoad());
    }

    if (this.filterCategory) {
      this.filterCategory.addEventListener('change', () => this._onCategoryChange());
    }

    if (this.filterYear) {
      this.filterYear.addEventListener('change', () => this._onYearChange());
    }

    if (this.filterMonth) {
      this.filterMonth.addEventListener('change', () => this.loadPeriodComprobantes());
    }

    if (this.btnOpenCurrentPeriodFolder) {
      this.btnOpenCurrentPeriodFolder.addEventListener('click', () => this._openCurrentFolder());
    }

    if (this.btnGenerateAtsXml) {
      this.btnGenerateAtsXml.addEventListener('click', () => this.generateAts());
    }

    if (this.btnExportCsv) {
      this.btnExportCsv.addEventListener('click', () => this.exportCsv());
    }

    if (this.btnOpenAtsFolder) {
      this.btnOpenAtsFolder.addEventListener('click', () => {
        if (this.state.lastGeneratedFolder) {
          this.api.openFolderInExplorer(this.state.lastGeneratedFolder);
        }
      });
    }

    if (this.btnAcceptAtsModal) {
      this.btnAcceptAtsModal.addEventListener('click', () => {
        this.atsSuccessModal.classList.remove('active');
      });
    }

    if (this.btnCloseAtsModal) {
      this.btnCloseAtsModal.addEventListener('click', () => {
        this.atsSuccessModal.classList.remove('active');
      });
    }
  }

  _onCategoryChange() {
    this._updateYearAndMonthSelectors(false);
    this.loadPeriodComprobantes();
  }

  _onYearChange() {
    this._updateMonthSelector(false);
    this.loadPeriodComprobantes();
  }

  async refreshAndLoad() {
    const client = this.getActiveClient();
    if (client && client.defaultFolder) {
      this.periodsData = await this.api.getAvailablePeriods(client.defaultFolder);
      this._updateYearAndMonthSelectors(true);
    }
    await this.loadPeriodComprobantes();
  }

  /**
   * Se ejecuta cuando el usuario entra en la pestaña Visor XML & ATS
   */
  async activate(client) {
    if (!client || !client.defaultFolder) return;

    try {
      this.periodsData = await this.api.getAvailablePeriods(client.defaultFolder);
      this._updateYearAndMonthSelectors(true);
      await this.loadPeriodComprobantes();
    } catch (err) {
      console.error('Error inicializando módulo ATS en frontend:', err);
    }
  }

  _getCategoryData() {
    const category = this.filterCategory ? this.filterCategory.value : 'Compras';
    if (this.periodsData && this.periodsData.byCategory && this.periodsData.byCategory[category]) {
      return this.periodsData.byCategory[category];
    }
    if (this.periodsData) {
      return {
        years: this.periodsData.years || [],
        monthsByYear: this.periodsData.monthsByYear || {}
      };
    }
    return { years: [], monthsByYear: {} };
  }

  _updateYearAndMonthSelectors(preserveSelection = false) {
    const catData = this._getCategoryData();
    const availableYears = catData.years && catData.years.length > 0
      ? catData.years
      : [String(new Date().getFullYear())];

    const currentYearVal = this.filterYear.value;
    this.filterYear.innerHTML = '';

    availableYears.forEach(year => {
      const opt = document.createElement('option');
      opt.value = year;
      opt.textContent = year;
      this.filterYear.appendChild(opt);
    });

    if (preserveSelection && availableYears.includes(currentYearVal)) {
      this.filterYear.value = currentYearVal;
    } else {
      this.filterYear.value = availableYears[0];
    }

    this._updateMonthSelector(preserveSelection);
  }

  _updateMonthSelector(preserveSelection = false) {
    const catData = this._getCategoryData();
    const selectedYear = this.filterYear.value;
    const availableMonths = (catData.monthsByYear && catData.monthsByYear[selectedYear]) || [];

    const currentMonthVal = this.filterMonth.value;
    this.filterMonth.innerHTML = '';

    if (availableMonths.length > 0) {
      this.filterMonth.disabled = false;
      availableMonths.forEach(month => {
        const opt = document.createElement('option');
        opt.value = month;
        opt.textContent = this._getMonthLabel(month);
        this.filterMonth.appendChild(opt);
      });

      if (preserveSelection && availableMonths.includes(currentMonthVal)) {
        this.filterMonth.value = currentMonthVal;
      } else {
        // Seleccionar el mes más reciente disponible por defecto
        this.filterMonth.value = availableMonths[availableMonths.length - 1];
      }
    } else {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(Sin meses descargados)';
      opt.disabled = true;
      opt.selected = true;
      this.filterMonth.appendChild(opt);
      this.filterMonth.disabled = true;
    }
  }

  _getMonthLabel(monthFolderName) {
    if (!monthFolderName) return '';
    const MONTH_NAMES = {
      '01': '01 - Enero',
      '02': '02 - Febrero',
      '03': '03 - Marzo',
      '04': '04 - Abril',
      '05': '05 - Mayo',
      '06': '06 - Junio',
      '07': '07 - Julio',
      '08': '08 - Agosto',
      '09': '09 - Septiembre',
      '10': '10 - Octubre',
      '11': '11 - Noviembre',
      '12': '12 - Diciembre'
    };
    if (/^\d{2}\s*-\s*\w+/i.test(monthFolderName)) {
      return monthFolderName;
    }
    const match = String(monthFolderName).match(/(?:Mes_)?(\d{1,2})/i);
    if (match) {
      const pad = match[1].padStart(2, '0');
      if (MONTH_NAMES[pad]) {
        return MONTH_NAMES[pad];
      }
    }
    return monthFolderName;
  }

  /**
   * Carga los XMLs correspondientes al periodo seleccionado
   */
  async loadPeriodComprobantes() {
    const client = this.getActiveClient();
    if (!client || !client.defaultFolder) return;

    const category = this.filterCategory.value;
    const year = this.filterYear.value;
    const month = this.filterMonth.value;

    if (!year || !month) {
      this.state.category = category;
      this.state.year = year || '';
      this.state.month = '';
      this.state.items = [];
      this.state.totals = { count: 0, base0: 0, baseGravada: 0, montoIva: 0, total: 0 };
      this._renderTable();
      return;
    }

    const monthLabel = this._getMonthLabel(month);
    this.tableBody.innerHTML = `
      <tr>
        <td colspan="13" class="table-empty-cell">
          Cargando comprobantes XML de ${category} (${monthLabel} ${year})...
        </td>
      </tr>
    `;

    try {
      const res = await this.api.loadPeriodXmls({
        clientFolder: client.defaultFolder,
        category,
        year,
        month
      });

      this.state.category = category;
      this.state.year = year;
      this.state.month = month;
      this.state.items = res.items || [];
      this.state.totals = res.totals || { count: 0, base0: 0, baseGravada: 0, montoIva: 0, total: 0 };

      this._renderTable();
    } catch (err) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="13" class="table-empty-cell" style="color: #f87171;">
            Error cargando comprobantes: ${err.message}
          </td>
        </tr>
      `;
    }
  }

  _renderTable() {
    const items = this.state.items;
    const totals = this.state.totals;

    // Actualizar KPIs superiores
    this.kpiCount.textContent = totals.count;
    this.kpiBase0.textContent = `$${totals.base0.toFixed(2)}`;
    this.kpiBaseGrav.textContent = `$${totals.baseGravada.toFixed(2)}`;
    this.kpiMontoIva.textContent = `$${totals.montoIva.toFixed(2)}`;
    this.kpiTotal.textContent = `$${totals.total.toFixed(2)}`;

    // Totales en el pie de tabla
    this.footBase0.textContent = `$${totals.base0.toFixed(2)}`;
    this.footBaseGrav.textContent = `$${totals.baseGravada.toFixed(2)}`;
    this.footMontoIva.textContent = `$${totals.montoIva.toFixed(2)}`;
    this.footTotal.textContent = `$${totals.total.toFixed(2)}`;

    if (items.length === 0) {
      this.tableFoot.style.display = 'none';
      const mesTexto = this.state.month ? ` en <strong>${this._getMonthLabel(this.state.month)} ${this.state.year}</strong>` : '';
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="13" class="table-empty-cell">
            No se encontraron comprobantes XML descargados de <strong>${this.state.category}</strong>${mesTexto}.<br><br>
            Puedes ir a la pestaña <strong>"Navegador SRI"</strong> para descargarlos automáticamente o verificar la carpeta.
          </td>
        </tr>
      `;
      return;
    }

    this.tableFoot.style.display = 'table-footer-group';
    this.tableBody.innerHTML = '';

    items.forEach((item, index) => {
      const tr = document.createElement('tr');
      const emisor = item.emisor || {};
      const valores = item.valores || {};

      tr.innerHTML = `
        <td style="font-weight: 600; color: #64748b;">${index + 1}</td>
        <td>${this._escapeHtml(item.fechaEmision || '')}</td>
        <td><span class="badge-tipo-doc">${this._escapeHtml(item.tipoDocNombre || 'Factura')}</span></td>
        <td style="font-weight: 600; font-variant-numeric: tabular-nums;">${this._escapeHtml(item.serie || '')}</td>
        <td style="font-variant-numeric: tabular-nums;">${this._escapeHtml(emisor.ruc || '')}</td>
        <td title="${this._escapeHtml(emisor.razonSocial || '')}" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${this._escapeHtml(emisor.razonSocial || '')}
        </td>
        <td>
          <select class="select-sustento" data-index="${index}">
            <option value="01" ${item.codSustento === '01' ? 'selected' : ''}>01 - Crédito Tributario para IVA</option>
            <option value="02" ${item.codSustento === '02' ? 'selected' : ''}>02 - Costo o Gasto (IR)</option>
            <option value="03" ${item.codSustento === '03' ? 'selected' : ''}>03 - Activo Fijo</option>
            <option value="04" ${item.codSustento === '04' ? 'selected' : ''}>04 - Liquidación de Compra</option>
            <option value="05" ${item.codSustento === '05' ? 'selected' : ''}>05 - Pago a No Domiciliados</option>
            <option value="06" ${item.codSustento === '06' ? 'selected' : ''}>06 - Crédito Tributario RIMPE</option>
            <option value="00" ${item.codSustento === '00' ? 'selected' : ''}>00 - No aplica</option>
          </select>
        </td>
        <td style="text-align: right; font-variant-numeric: tabular-nums;">$${(valores.base0 || 0).toFixed(2)}</td>
        <td style="text-align: right; font-variant-numeric: tabular-nums;">$${(valores.baseGravada || 0).toFixed(2)}</td>
        <td style="text-align: right; font-variant-numeric: tabular-nums; color: #047857; font-weight: 700;">$${(valores.montoIva || 0).toFixed(2)}</td>
        <td style="text-align: right; font-variant-numeric: tabular-nums; color: #1a56db; font-weight: 700;">$${(valores.total || 0).toFixed(2)}</td>
        <td><span class="badge-pago">${this._escapeHtml(item.formaPago || '20')}</span></td>
        <td style="text-align: center;">
          <button class="btn-table-action btn-open-xml" title="Mostrar archivo XML en su carpeta">Abrir XML</button>
        </td>
      `;

      // Edición reactiva del sustento tributario
      const selectSustento = tr.querySelector('.select-sustento');
      selectSustento.addEventListener('change', (e) => {
        this.state.items[index].codSustento = e.target.value;
      });

      // Botón para revelar el archivo XML en el Explorador de archivos
      const btnOpenXml = tr.querySelector('.btn-open-xml');
      btnOpenXml.addEventListener('click', () => {
        if (item.filePath) {
          this.api.showItemInFolder(item.filePath);
        }
      });

      this.tableBody.appendChild(tr);
    });
  }

  /**
   * Genera el archivo oficial del ATS XML
   */
  async generateAts() {
    const client = this.getActiveClient();
    if (!client) return;

    if (!this.state.items || this.state.items.length === 0) {
      alert('No hay comprobantes cargados en este periodo para generar el ATS.\n\nSelecciona un mes con comprobantes descargados o cárgalos primero.');
      return;
    }

    try {
      this.showBanner('Generando Anexo Transaccional Simplificado (ATS)...', 'info');

      const isCompras = this.state.category === 'Compras';
      const comprasPayload = isCompras ? this.state.items : [];
      const ventasPayload = !isCompras ? this.state.items : [];

      const result = await this.api.generateAtsXml({
        client,
        year: this.state.year,
        month: this.state.month,
        compras: comprasPayload,
        ventas: ventasPayload
      });

      if (result.success) {
        this.state.lastGeneratedFolder = result.folderPath;
        this.atsGeneratedFileName.textContent = result.fileName;
        this.atsGeneratedCount.textContent = `${result.totalCompras} comprobantes de compras, ${result.totalVentas} comprobantes de ventas`;
        this.atsGeneratedFilePath.textContent = result.filePath;

        this.atsSuccessModal.classList.add('active');
        this.showBanner(`Anexo ATS generado exitosamente: ${result.fileName}`, 'success', 5000);
      } else {
        alert('Error generando el anexo ATS: ' + result.error);
      }
    } catch (e) {
      alert('Error en la generación de ATS: ' + e.message);
    }
  }

  /**
   * Exporta a formato CSV compatible con Microsoft Excel
   */
  async exportCsv() {
    const client = this.getActiveClient();
    if (!client || !this.state.items || this.state.items.length === 0) {
      alert('No hay comprobantes cargados para exportar.');
      return;
    }

    try {
      const res = await this.api.exportToCsv({
        client,
        category: this.state.category,
        year: this.state.year,
        month: this.state.month,
        items: this.state.items
      });

      if (res.success) {
        this.showBanner(`Reporte exportado exitosamente: ${res.fileName}`, 'success', 5000);
        this.api.openFolderInExplorer(res.folderPath);
      } else {
        alert('Error exportando reporte: ' + res.error);
      }
    } catch (e) {
      alert('Error exportando CSV: ' + e.message);
    }
  }

  _openCurrentFolder() {
    const client = this.getActiveClient();
    if (!client || !client.defaultFolder) return;
    const cat = this.filterCategory ? this.filterCategory.value : '';
    const year = this.filterYear ? this.filterYear.value : '';
    const month = this.filterMonth ? this.filterMonth.value : '';
    const sep = navigator.userAgent.includes('Windows') ? '\\' : '/';
    let folder = client.defaultFolder;
    if (cat) folder += `${sep}${cat}`;
    if (year) folder += `${sep}${year}`;
    if (month) folder += `${sep}${month}`;
    this.api.openFolderInExplorer(folder);
  }

  _escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }
}

// Exportar para su uso en la aplicación
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AtsModuleView;
} else {
  window.AtsModuleView = AtsModuleView;
}
