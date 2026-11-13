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
    this.atsMoreActionsDropdown = document.getElementById('atsMoreActionsDropdown');
    this.btnAtsMoreActions = document.getElementById('btnAtsMoreActions');

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
    this.atsGeneratedZipName = document.getElementById('atsGeneratedZipName');
    this.atsGeneratedZipSize = document.getElementById('atsGeneratedZipSize');
    this.atsGeneratedFileName = document.getElementById('atsGeneratedFileName');
    this.atsGeneratedCount = document.getElementById('atsGeneratedCount');
    this.atsGeneratedFilePath = document.getElementById('atsGeneratedFilePath');
    this.atsValidationSummary = document.getElementById('atsValidationSummary');
    this.btnOpenAtsFolder = document.getElementById('btnOpenAtsFolder');
    this.btnUploadAtsToSri = document.getElementById('btnUploadAtsToSri');
    this.btnCheckTalonResumen = document.getElementById('btnCheckTalonResumen');
    this.btnCheckErroresSri = document.getElementById('btnCheckErroresSri');
    this.btnAcceptAtsModal = document.getElementById('btnAcceptAtsModal');
    this.btnCloseAtsModal = document.getElementById('btnCloseAtsModal');
    this.btnValidateAtsPeriod = document.getElementById('btnValidateAtsPeriod');

    // Controles para Todos los Meses y ATS en Ceros
    this.chkShowAllMonthsAts = document.getElementById('chkShowAllMonthsAts');
    this.btnGenerateAtsCeros = document.getElementById('btnGenerateAtsCeros');
    this.atsCerosModal = document.getElementById('atsCerosModal');
    this.btnCloseAtsCerosModal = document.getElementById('btnCloseAtsCerosModal');
    this.btnCancelAtsCeros = document.getElementById('btnCancelAtsCeros');
    this.btnConfirmGenerateCeros = document.getElementById('btnConfirmGenerateCeros');
    this.atsCerosYear = document.getElementById('atsCerosYear');
    this.atsCerosMonth = document.getElementById('atsCerosMonth');
    this.atsCerosClientRuc = document.getElementById('atsCerosClientRuc');
    this.atsCerosClientName = document.getElementById('atsCerosClientName');
    this.atsCerosTargetFile = document.getElementById('atsCerosTargetFile');

    // Modal Flotante de Factura Electrónica (RIDE)
    this.invoiceViewerModal = document.getElementById('invoiceViewerModal');
    this.invoiceViewerBody = document.getElementById('invoiceViewerBody');
    this.invoiceViewerTitle = document.getElementById('invoiceViewerTitle');
    this.invViewerDocBadge = document.getElementById('invViewerDocBadge');
    this.invViewerSerie = document.getElementById('invViewerSerie');
    this.btnInvoicePrint = document.getElementById('btnInvoicePrint');
    this.btnInvoiceCopyClave = document.getElementById('btnInvoiceCopyClave');
    this.btnInvoiceOpenFolder = document.getElementById('btnInvoiceOpenFolder');
    this.btnInvoiceDownload = document.getElementById('btnInvoiceDownload');
    this.btnInvoiceDownloadLabel = document.getElementById('btnInvoiceDownloadLabel');
    this.btnFooterInvoiceDownload = document.getElementById('btnFooterInvoiceDownload');
    this.btnFooterInvoiceDownloadLabel = document.getElementById('btnFooterInvoiceDownloadLabel');
    this.btnCloseInvoiceViewer = document.getElementById('btnCloseInvoiceViewer');
    this.btnDismissInvoiceViewer = document.getElementById('btnDismissInvoiceViewer');

    // Elementos de Conciliación Tributaria (Punto G)
    this.btnAtsReconcile = document.getElementById('btnAtsReconcile');
    this.atsReconciliationModal = document.getElementById('atsReconciliationModal');
    this.btnCloseReconciliationModal = document.getElementById('btnCloseReconciliationModal');
    this.btnAcceptReconciliation = document.getElementById('btnAcceptReconciliation');
    this.tabReconcileF104 = document.getElementById('tabReconcileF104');
    this.tabReconcileF103 = document.getElementById('tabReconcileF103');
    this.panelReconcileF104 = document.getElementById('panelReconcileF104');
    this.panelReconcileF103 = document.getElementById('panelReconcileF103');
    this.atsReconcileF104Body = document.getElementById('atsReconcileF104Body');
    this.atsReconcileF103Body = document.getElementById('atsReconcileF103Body');
    this.btnAtsReconcileAutofill = document.getElementById('btnAtsReconcileAutofill');
    this.btnAtsReconcilePrint = document.getElementById('btnAtsReconcilePrint');
    this.recKpiVentasGrav = document.getElementById('recKpiVentasGrav');
    this.recKpiIvaVentas = document.getElementById('recKpiIvaVentas');
    this.recKpiComprasGrav = document.getElementById('recKpiComprasGrav');
    this.recKpiIvaCompras = document.getElementById('recKpiIvaCompras');
    this.recKpiTotalAir = document.getElementById('recKpiTotalAir');
    this.recKpiTotalRetIva = document.getElementById('recKpiTotalRetIva');
    this.recKpiTotalF103 = document.getElementById('recKpiTotalF103');
    this.recFooterStatus = document.getElementById('recFooterStatus');

    // Elementos de Registro de Comprobantes Físicos
    this.btnOpenPhysicalDocModal = document.getElementById('btnOpenPhysicalDocModal');
    this.atsPhysicalDocModal = document.getElementById('atsPhysicalDocModal');
    this.btnClosePhysicalDocModal = document.getElementById('btnClosePhysicalDocModal');
    this.btnCancelPhysicalDoc = document.getElementById('btnCancelPhysicalDoc');
    this.btnSavePhysicalDoc = document.getElementById('btnSavePhysicalDoc');
    this.physDocType = document.getElementById('physDocType');
    this.physFechaEmision = document.getElementById('physFechaEmision');
    this.physRuc = document.getElementById('physRuc');
    this.physRazonSocial = document.getElementById('physRazonSocial');
    this.physSerie = document.getElementById('physSerie');
    this.physAutorizacion = document.getElementById('physAutorizacion');
    this.physBase0 = document.getElementById('physBase0');
    this.physBaseGravada = document.getElementById('physBaseGravada');
    this.physIva = document.getElementById('physIva');
    this.physCodSustento = document.getElementById('physCodSustento');
    this.physFormaPago = document.getElementById('physFormaPago');

    this.currentPreviewData = null;
    this.currentSavedPath = null;
    this.currentInvoiceClave = '';
    this.currentReconciliation = null;
  }

  _bindEvents() {
    if (this.btnLoadPeriodXmls) {
      this.btnLoadPeriodXmls.addEventListener('click', () => this.refreshAndLoad());
    }

    if (this.filterCategory) {
      this.filterCategory.addEventListener('change', () => this._onCategoryChange());
    }

    // Sincronización del selector segmentado visual (Compras / Ventas)
    if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
      const segmentBtns = document.querySelectorAll('#atsSegmentedCategory .ats-segment-btn');
      segmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const cat = btn.getAttribute('data-category');
          if (this.filterCategory && this.filterCategory.value !== cat) {
            this.filterCategory.value = cat;
            this.filterCategory.dispatchEvent(new Event('change'));
          } else {
            this._syncSegmentedCategory(cat);
          }
        });
      });
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

    if (this.btnValidateAtsPeriod) {
      this.btnValidateAtsPeriod.addEventListener('click', () => this.validateCurrentPeriod());
    }

    if (this.btnExportCsv) {
      this.btnExportCsv.addEventListener('click', () => this.exportCsv());
    }

    // Control del Menú Desplegable 'Herramientas' (Progressive Disclosure)
    if (this.btnAtsMoreActions && this.atsMoreActionsDropdown) {
      this.btnAtsMoreActions.addEventListener('click', (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        const isOpen = this.atsMoreActionsDropdown.classList.toggle('open');
        this.btnAtsMoreActions.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      if (typeof this.atsMoreActionsDropdown.querySelectorAll === 'function') {
        const menuItems = this.atsMoreActionsDropdown.querySelectorAll('.ats-dropdown-item');
        menuItems.forEach(item => {
          item.addEventListener('click', () => {
            this.atsMoreActionsDropdown.classList.remove('open');
            this.btnAtsMoreActions.setAttribute('aria-expanded', 'false');
          });
        });
      }

      if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('click', (e) => {
          if (this.atsMoreActionsDropdown && e && e.target && typeof this.atsMoreActionsDropdown.contains === 'function') {
            if (!this.atsMoreActionsDropdown.contains(e.target)) {
              this.atsMoreActionsDropdown.classList.remove('open');
              this.btnAtsMoreActions.setAttribute('aria-expanded', 'false');
            }
          }
        });
      }
    }

    if (this.btnOpenAtsFolder) {
      this.btnOpenAtsFolder.addEventListener('click', () => {
        if (this.state.lastGeneratedFolder) {
          this.api.openFolderInExplorer(this.state.lastGeneratedFolder);
        }
      });
    }

    if (this.btnUploadAtsToSri) {
      this.btnUploadAtsToSri.addEventListener('click', () => {
        this.atsSuccessModal.classList.remove('active');
        if (window.tribuNavDelegate && typeof window.tribuNavDelegate.goToSriUrl === 'function') {
          window.tribuNavDelegate.goToSriUrl('ats_carga');
        }
      });
    }

    if (this.btnCheckTalonResumen) {
      this.btnCheckTalonResumen.addEventListener('click', () => {
        this.atsSuccessModal.classList.remove('active');
        if (window.tribuNavDelegate && typeof window.tribuNavDelegate.goToSriUrl === 'function') {
          window.tribuNavDelegate.goToSriUrl('ats_talon');
        }
      });
    }

    if (this.btnCheckErroresSri) {
      this.btnCheckErroresSri.addEventListener('click', () => {
        this.atsSuccessModal.classList.remove('active');
        if (window.tribuNavDelegate && typeof window.tribuNavDelegate.goToSriUrl === 'function') {
          window.tribuNavDelegate.goToSriUrl('ats_errores');
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

    if (this.btnCloseInvoiceViewer) {
      this.btnCloseInvoiceViewer.addEventListener('click', () => {
        this.closeInvoiceViewer();
      });
    }

    if (this.btnDismissInvoiceViewer) {
      this.btnDismissInvoiceViewer.addEventListener('click', () => {
        this.closeInvoiceViewer();
      });
    }

    if (this.btnInvoiceDownload) {
      this.btnInvoiceDownload.addEventListener('click', () => {
        this.downloadCurrentPreview();
      });
    }

    if (this.btnFooterInvoiceDownload) {
      this.btnFooterInvoiceDownload.addEventListener('click', () => {
        this.downloadCurrentPreview();
      });
    }

    if (this.chkShowAllMonthsAts) {
      this.chkShowAllMonthsAts.addEventListener('change', () => {
        this._updateMonthSelector(true);
        this.loadPeriodComprobantes();
      });
    }

    if (this.btnGenerateAtsCeros) {
      this.btnGenerateAtsCeros.addEventListener('click', () => {
        this.openAtsCerosModal();
      });
    }

    if (this.btnCloseAtsCerosModal) {
      this.btnCloseAtsCerosModal.addEventListener('click', () => {
        this.closeAtsCerosModal();
      });
    }

    if (this.btnCancelAtsCeros) {
      this.btnCancelAtsCeros.addEventListener('click', () => {
        this.closeAtsCerosModal();
      });
    }

    if (this.btnConfirmGenerateCeros) {
      this.btnConfirmGenerateCeros.addEventListener('click', () => {
        this.confirmGenerateAtsCeros();
      });
    }

    if (this.atsCerosYear) {
      this.atsCerosYear.addEventListener('change', () => this._updateCerosTargetFileName());
    }

    if (this.atsCerosMonth) {
      this.atsCerosMonth.addEventListener('change', () => this._updateCerosTargetFileName());
    }

    // Eventos de Conciliación Tributaria (Punto G)
    if (this.btnAtsReconcile) {
      this.btnAtsReconcile.addEventListener('click', () => this.openReconciliationModal());
    }

    if (this.btnCloseReconciliationModal) {
      this.btnCloseReconciliationModal.addEventListener('click', () => {
        this.atsReconciliationModal.classList.remove('active');
      });
    }

    if (this.btnAcceptReconciliation) {
      this.btnAcceptReconciliation.addEventListener('click', () => {
        this.atsReconciliationModal.classList.remove('active');
      });
    }

    if (this.tabReconcileF104) {
      this.tabReconcileF104.addEventListener('click', () => {
        this.tabReconcileF104.classList.add('active', 'font-bold');
        this.tabReconcileF103.classList.remove('active', 'font-bold');
        this.panelReconcileF104.style.display = 'block';
        this.panelReconcileF103.style.display = 'none';
      });
    }

    if (this.tabReconcileF103) {
      this.tabReconcileF103.addEventListener('click', () => {
        this.tabReconcileF103.classList.add('active', 'font-bold');
        this.tabReconcileF104.classList.remove('active', 'font-bold');
        this.panelReconcileF103.style.display = 'block';
        this.panelReconcileF104.style.display = 'none';
      });
    }

    if (this.btnAtsReconcileAutofill) {
      this.btnAtsReconcileAutofill.addEventListener('click', () => this.autofillReconciliationFromAts());
    }

    if (this.btnAtsReconcilePrint) {
      this.btnAtsReconcilePrint.addEventListener('click', () => this.printReconciliationReport());
    }

    // Eventos de Comprobantes Físicos
    if (this.btnOpenPhysicalDocModal) {
      this.btnOpenPhysicalDocModal.addEventListener('click', () => this.openPhysicalDocModal());
    }

    if (this.btnClosePhysicalDocModal) {
      this.btnClosePhysicalDocModal.addEventListener('click', () => {
        this.atsPhysicalDocModal.classList.remove('active');
      });
    }

    if (this.btnCancelPhysicalDoc) {
      this.btnCancelPhysicalDoc.addEventListener('click', () => {
        this.atsPhysicalDocModal.classList.remove('active');
      });
    }

    if (this.btnSavePhysicalDoc) {
      this.btnSavePhysicalDoc.addEventListener('click', () => this.savePhysicalDoc());
    }
  }

  _onCategoryChange() {
    const cat = this.filterCategory ? this.filterCategory.value : 'Compras';
    this._syncSegmentedCategory(cat);
    this._updateYearAndMonthSelectors(false);
    this.loadPeriodComprobantes();
  }

  _syncSegmentedCategory(cat) {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
    const segmentBtns = document.querySelectorAll('#atsSegmentedCategory .ats-segment-btn');
    if (segmentBtns && segmentBtns.length > 0) {
      segmentBtns.forEach(b => {
        const isActive = b.getAttribute('data-category') === cat;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }
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

    const showAllMonths = Boolean(this.chkShowAllMonthsAts && this.chkShowAllMonthsAts.checked);

    if (showAllMonths) {
      const ALL_MONTHS = [
        '01 - Enero', '02 - Febrero', '03 - Marzo', '04 - Abril',
        '05 - Mayo', '06 - Junio', '07 - Julio', '08 - Agosto',
        '09 - Septiembre', '10 - Octubre', '11 - Noviembre', '12 - Diciembre'
      ];
      this.filterMonth.disabled = false;
      ALL_MONTHS.forEach(month => {
        const opt = document.createElement('option');
        opt.value = month;
        const hasData = availableMonths.includes(month);
        opt.textContent = hasData ? month : `${month} (En cero)`;
        this.filterMonth.appendChild(opt);
      });

      if (preserveSelection && currentMonthVal) {
        this.filterMonth.value = currentMonthVal;
      } else if (availableMonths.length > 0) {
        this.filterMonth.value = availableMonths[availableMonths.length - 1];
      } else {
        this.filterMonth.value = ALL_MONTHS[0];
      }
    } else if (availableMonths.length > 0) {
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

      const isFisico = Boolean(item.esFisico);
      const hasAir = Boolean(item.retencionesAir && item.retencionesAir.length > 0);

      const tipoBadgeHtml = isFisico
        ? `<span class="badge" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 11px; padding: 2px 6px; border-radius: 4px;">Físico (${this._escapeHtml(item.tipoDocNombre || 'Nota Venta')})</span>`
        : `<span class="badge-tipo-doc">${this._escapeHtml(item.tipoDocNombre || 'Factura')}</span>`;

      const airBadgeHtml = hasAir
        ? `<span class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 10px; margin-left: 4px; padding: 1px 4px; border-radius: 4px;" title="Retención AIR aplicada">AIR</span>`
        : '';

      const deleteBtnHtml = isFisico
        ? `<button class="btn-table-action btn-delete-phys" data-id="${item.id}" title="Eliminar comprobante físico" style="color: #ef4444; margin-left: 4px;">Eliminar</button>`
        : '';

      tr.innerHTML = `
        <td style="font-weight: 600; color: #64748b;">${index + 1}</td>
        <td>${this._escapeHtml(item.fechaEmision || '')}</td>
        <td>${tipoBadgeHtml}${airBadgeHtml}</td>
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
          <button class="btn-table-action btn-view-factura" data-index="${index}" title="Ver factura digital (RIDE)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>Ver Factura</span>
          </button>
          ${deleteBtnHtml}
        </td>
      `;

      // Edición reactiva del sustento tributario
      const selectSustento = tr.querySelector('.select-sustento');
      selectSustento.addEventListener('change', (e) => {
        this.state.items[index].codSustento = e.target.value;
      });

      // Botón para ver la factura en ventana flotante (RIDE oficial)
      const btnViewFactura = tr.querySelector('.btn-view-factura');
      btnViewFactura.addEventListener('click', () => {
        this.openInvoiceViewer(item);
      });

      // Botón para eliminar comprobante físico
      if (isFisico) {
        const btnDel = tr.querySelector('.btn-delete-phys');
        if (btnDel) {
          btnDel.addEventListener('click', () => {
            this.deletePhysicalDoc(item.id);
          });
        }
      }

      this.tableBody.appendChild(tr);
    });
  }

  /**
   * Genera el archivo oficial del ATS XML y paquete ZIP oficial SRI
   */
  async generateAts() {
    const client = this.getActiveClient();
    if (!client) return;

    if (!this.state.items || this.state.items.length === 0) {
      const mesTxt = this._getMonthLabel(this.state.month) || this.state.month || 'del período seleccionado';
      const yearTxt = this.state.year || String(new Date().getFullYear());
      const confirmCeros = confirm(`No se encontraron comprobantes cargados para ${mesTxt} ${yearTxt}.\n\n¿Deseas generar el Anexo Transaccional Simplificado (ATS) EN CEROS (sin movimiento) para este período ante el SRI?`);
      if (!confirmCeros) return;
    }

    try {
      this.showBanner('Consolidando Compras y Ventas del período...', 'info');

      const isCompras = this.state.category === 'Compras';
      let comprasPayload = isCompras ? (this.state.items || []) : [];
      let ventasPayload = !isCompras ? (this.state.items || []) : [];

      // Cargar la contraparte automáticamente para asegurar la consolidación completa del ATS
      if (isCompras && (!ventasPayload || ventasPayload.length === 0)) {
        try {
          const vRes = await this.api.loadPeriodXmls({
            clientFolder: client.defaultFolder,
            category: 'Ventas',
            year: this.state.year,
            month: this.state.month
          });
          ventasPayload = (vRes && vRes.items) || [];
        } catch (e) {
          console.warn('No se encontraron ventas para consolidar en este período:', e);
        }
      } else if (!isCompras && (!comprasPayload || comprasPayload.length === 0)) {
        try {
          const cRes = await this.api.loadPeriodXmls({
            clientFolder: client.defaultFolder,
            category: 'Compras',
            year: this.state.year,
            month: this.state.month
          });
          comprasPayload = (cRes && cRes.items) || [];
        } catch (e) {
          console.warn('No se encontraron compras para consolidar en este período:', e);
        }
      }

      const isCeros = comprasPayload.length === 0 && ventasPayload.length === 0;

      // Validar datos normativos
      if (this.api && typeof this.api.validateAtsPeriod === 'function') {
        const valRes = await this.api.validateAtsPeriod({
          client,
          year: this.state.year,
          month: this.state.month,
          compras: comprasPayload,
          ventas: ventasPayload
        });

        if (valRes && !valRes.isValid && valRes.errors.length > 0) {
          const errList = valRes.errors.join('\n- ');
          const proceed = confirm(`Se detectaron inconsistencias técnicas para el SRI:\n\n- ${errList}\n\n¿Deseas generar el anexo de todas formas?`);
          if (!proceed) return;
        }
      }

      this.showBanner(isCeros ? 'Generando paquete ATS en CEROS (sin movimiento)...' : 'Generando paquete ATS oficial (XML y ZIP)...', 'info');

      const result = await this.api.generateAtsXml({
        client,
        year: this.state.year,
        month: this.state.month,
        compras: comprasPayload,
        ventas: ventasPayload
      });

      if (result.success) {
        this.state.lastGeneratedFolder = result.folderPath;
        if (this.atsGeneratedZipName) {
          this.atsGeneratedZipName.textContent = result.zipFileName || `AT${this.state.month}${this.state.year}.zip`;
        }
        if (this.atsGeneratedZipSize) {
          const sizeKb = ((result.zipSizeBytes || 0) / 1024).toFixed(1);
          this.atsGeneratedZipSize.textContent = `(${sizeKb} KB - Límite SRI: 8 MB)`;
        }
        if (this.atsGeneratedFileName) {
          this.atsGeneratedFileName.textContent = result.xmlFileName || result.fileName;
        }
        if (this.atsGeneratedCount) {
          if (result.totalCompras === 0 && result.totalVentas === 0) {
            this.atsGeneratedCount.textContent = '0 compras, 0 ventas (Período sin movimiento - En Ceros)';
          } else {
            this.atsGeneratedCount.textContent = `${result.totalCompras} compras, ${result.totalVentas} ventas (Total Ventas: $${(result.totalMontoVentas || 0).toFixed(2)})`;
          }
        }
        if (this.atsGeneratedFilePath) {
          this.atsGeneratedFilePath.textContent = result.zipFilePath || result.filePath;
        }

        if (this.atsValidationSummary) {
          const val = result.validation;
          if (isCeros) {
            this.atsValidationSummary.innerHTML = `
              <div style="color: #047857; font-weight: 600;">
                Estructura de anexo en CEROS conforme al estándar SRI para períodos sin movimiento.
              </div>
            `;
          } else if (val && val.warnings && val.warnings.length > 0) {
            this.atsValidationSummary.innerHTML = `
              <div style="background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 6px 10px; border-radius: 4px;">
                <strong>Avisos normativos:</strong>
                <ul style="margin: 4px 0 0 16px; padding: 0;">
                  ${val.warnings.map(w => `<li>${this._escapeHtml(w)}</li>`).join('')}
                </ul>
              </div>
            `;
          } else {
            this.atsValidationSummary.innerHTML = `
              <div style="color: #047857; font-weight: 600;">
                Validación técnica SRI: Conforme a la Ficha Técnica oficial.
              </div>
            `;
          }
        }

        this.atsSuccessModal.classList.add('active');
        this.showBanner(`Paquete ATS ${isCeros ? 'en Ceros ' : ''}generado exitosamente: ${result.zipFileName || result.fileName}`, 'success', 5000);
      } else {
        alert('Error generando el anexo ATS: ' + result.error);
      }
    } catch (e) {
      alert('Error en la generación de ATS: ' + e.message);
    }
  }

  /**
   * Abre el modal para configurar y generar un ATS en ceros para cualquier período
   */
  openAtsCerosModal() {
    const client = this.getActiveClient();
    if (!client) {
      alert('Selecciona primero un cliente para generar el ATS en ceros.');
      return;
    }

    if (this.atsCerosClientRuc) {
      this.atsCerosClientRuc.textContent = client.ruc || '';
    }
    if (this.atsCerosClientName) {
      this.atsCerosClientName.textContent = client.razonSocial || client.name || '';
    }

    // Poblar selector de años (año actual y hasta 4 años anteriores)
    if (this.atsCerosYear) {
      this.atsCerosYear.innerHTML = '';
      const currentYear = new Date().getFullYear();
      for (let y = currentYear; y >= currentYear - 4; y--) {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = String(y);
        this.atsCerosYear.appendChild(opt);
      }
      if (this.state.year) {
        this.atsCerosYear.value = this.state.year;
      }
    }

    // Poblar selector de meses
    if (this.atsCerosMonth) {
      this.atsCerosMonth.innerHTML = '';
      const MONTHS = [
        '01 - Enero', '02 - Febrero', '03 - Marzo', '04 - Abril',
        '05 - Mayo', '06 - Junio', '07 - Julio', '08 - Agosto',
        '09 - Septiembre', '10 - Octubre', '11 - Noviembre', '12 - Diciembre'
      ];
      MONTHS.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        this.atsCerosMonth.appendChild(opt);
      });
      if (this.state.month) {
        this.atsCerosMonth.value = this.state.month;
      }
    }

    this._updateCerosTargetFileName();
    if (this.atsCerosModal) {
      this.atsCerosModal.classList.add('active');
    }
  }

  /**
   * Cierra el modal de ATS en ceros
   */
  closeAtsCerosModal() {
    if (this.atsCerosModal) {
      this.atsCerosModal.classList.remove('active');
    }
  }

  /**
   * Actualiza el nombre previsto del archivo según año y mes seleccionados en el modal de ceros
   */
  _updateCerosTargetFileName() {
    if (!this.atsCerosTargetFile || !this.atsCerosYear || !this.atsCerosMonth) return;
    const year = this.atsCerosYear.value || String(new Date().getFullYear());
    const monthMatch = String(this.atsCerosMonth.value).match(/\b(\d{1,2})\b/);
    const month = monthMatch ? monthMatch[1].padStart(2, '0') : '01';
    this.atsCerosTargetFile.textContent = `AT${month}${year}.zip`;
  }

  /**
   * Confirma y genera el ATS en ceros directamente
   */
  async confirmGenerateAtsCeros() {
    const client = this.getActiveClient();
    if (!client) return;

    const year = this.atsCerosYear ? this.atsCerosYear.value : String(new Date().getFullYear());
    const month = this.atsCerosMonth ? this.atsCerosMonth.value : '01 - Enero';

    this.closeAtsCerosModal();
    this.showBanner(`Generando Anexo ATS en CEROS para ${month} ${year}...`, 'info');

    try {
      const result = await this.api.generateAtsXml({
        client,
        year,
        month,
        compras: [],
        ventas: []
      });

      if (result.success) {
        this.state.lastGeneratedFolder = result.folderPath;
        if (this.atsGeneratedZipName) {
          this.atsGeneratedZipName.textContent = result.zipFileName;
        }
        if (this.atsGeneratedZipSize) {
          const sizeKb = ((result.zipSizeBytes || 0) / 1024).toFixed(1);
          this.atsGeneratedZipSize.textContent = `(${sizeKb} KB - Límite SRI: 8 MB)`;
        }
        if (this.atsGeneratedFileName) {
          this.atsGeneratedFileName.textContent = result.xmlFileName;
        }
        if (this.atsGeneratedCount) {
          this.atsGeneratedCount.textContent = '0 compras, 0 ventas (Período sin movimiento - En Ceros)';
        }
        if (this.atsGeneratedFilePath) {
          this.atsGeneratedFilePath.textContent = result.zipFilePath || result.filePath;
        }

        if (this.atsValidationSummary) {
          this.atsValidationSummary.innerHTML = `
            <div style="color: #047857; font-weight: 600;">
              Anexo en Ceros validado: Cumple con la estructura de declaración sin movimiento ante el SRI (Total Ventas: $0.00).
            </div>
          `;
        }

        this.atsSuccessModal.classList.add('active');
        this.showBanner(`Anexo ATS en Ceros generado exitosamente: ${result.zipFileName}`, 'success', 5000);
      } else {
        alert('Error generando el ATS en ceros: ' + result.error);
      }
    } catch (e) {
      alert('Error en la generación de ATS en ceros: ' + e.message);
    }
  }

  /**
   * Valida el período actual contra reglas técnicas del SRI y muestra el reporte
   */
  async validateCurrentPeriod() {
    const client = this.getActiveClient();
    if (!client) return;

    if (!this.state.items || this.state.items.length === 0) {
      alert('Carga primero los comprobantes del período para poder validar.');
      return;
    }

    try {
      this.showBanner('Validando período contra reglas técnicas del SRI...', 'info');

      const isCompras = this.state.category === 'Compras';
      let comprasPayload = isCompras ? this.state.items : [];
      let ventasPayload = !isCompras ? this.state.items : [];

      if (isCompras) {
        try {
          const vRes = await this.api.loadPeriodXmls({
            clientFolder: client.defaultFolder,
            category: 'Ventas',
            year: this.state.year,
            month: this.state.month
          });
          ventasPayload = (vRes && vRes.items) || [];
        } catch (e) {}
      } else {
        try {
          const cRes = await this.api.loadPeriodXmls({
            clientFolder: client.defaultFolder,
            category: 'Compras',
            year: this.state.year,
            month: this.state.month
          });
          comprasPayload = (cRes && cRes.items) || [];
        } catch (e) {}
      }

      if (this.api && typeof this.api.validateAtsPeriod === 'function') {
        const val = await this.api.validateAtsPeriod({
          client,
          year: this.state.year,
          month: this.state.month,
          compras: comprasPayload,
          ventas: ventasPayload
        });

        if (val.isValid && val.warnings.length === 0) {
          alert(`Período ${this.state.month} ${this.state.year} VALIDADO CON ÉXITO.\n\n- Compras: ${val.summary.totalCompras} ($${val.summary.montoTotalCompras.toFixed(2)})\n- Ventas: ${val.summary.totalVentas} ($${val.summary.montoTotalVentas.toFixed(2)})\n- Cumple al 100% con la Ficha Técnica del SRI.`);
        } else {
          let msg = `Reporte de Validación ATS (${this.state.month} ${this.state.year}):\n\n`;
          if (val.errors.length > 0) {
            msg += `ERRORES (${val.errors.length}):\n- ` + val.errors.join('\n- ') + '\n\n';
          }
          if (val.warnings.length > 0) {
            msg += `OBSERVACIONES (${val.warnings.length}):\n- ` + val.warnings.join('\n- ') + '\n\n';
          }
          msg += `Resumen:\n- Compras: ${val.summary.totalCompras} ($${val.summary.montoTotalCompras.toFixed(2)})\n- Ventas: ${val.summary.totalVentas} ($${val.summary.montoTotalVentas.toFixed(2)})`;
          alert(msg);
        }
      }
    } catch (e) {
      alert('Error durante la validación: ' + e.message);
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

  /**
   * Abre la factura en el visor interactivo (Formato Oficial RIDE SRI)
   */
  openInvoiceViewer(item) {
    if (!item) return;

    if (!this.invoiceViewerModal) {
      this.invoiceViewerModal = document.getElementById('invoiceViewerModal');
      this.invoiceViewerBody = document.getElementById('invoiceViewerBody');
      this.invoiceViewerTitle = document.getElementById('invoiceViewerTitle');
      this.invViewerDocBadge = document.getElementById('invViewerDocBadge');
      this.invViewerSerie = document.getElementById('invViewerSerie');
      this.btnInvoicePrint = document.getElementById('btnInvoicePrint');
      this.btnInvoiceCopyClave = document.getElementById('btnInvoiceCopyClave');
      this.btnInvoiceOpenFolder = document.getElementById('btnInvoiceOpenFolder');
      this.btnInvoiceDownload = document.getElementById('btnInvoiceDownload');
      this.btnInvoiceDownloadLabel = document.getElementById('btnInvoiceDownloadLabel');
      this.btnFooterInvoiceDownload = document.getElementById('btnFooterInvoiceDownload');
      this.btnFooterInvoiceDownloadLabel = document.getElementById('btnFooterInvoiceDownloadLabel');
    }

    if (!this.invoiceViewerModal || !this.invoiceViewerBody) return;

    const claveAcceso = item.claveAcceso || item.numeroAutorizacion || '';
    this.currentInvoiceClave = claveAcceso;
    this.currentSavedPath = item.filePath || null;
    this.currentPreviewData = {
      fileType: 'xml',
      parsedItem: item,
      tempPath: item.filePath || null,
      fileName: (item.serie || 'comprobante') + '.xml',
      claveAcceso: claveAcceso,
      category: this.filterCategory ? this.filterCategory.value : 'Compras'
    };

    if (this.invoiceViewerTitle) {
      this.invoiceViewerTitle.textContent = `${item.tipoDocNombre || 'Factura'} Electrónica`;
    }
    if (this.invViewerDocBadge) {
      this.invViewerDocBadge.textContent = item.tipoDocNombre || 'FACTURA';
    }
    if (this.invViewerSerie) {
      this.invViewerSerie.textContent = `Nº ${item.serie || '000-000-000000000'}`;
    }

    if (this.btnInvoicePrint) {
      this.btnInvoicePrint.onclick = () => {
        window.print();
      };
    }

    if (this.btnInvoiceCopyClave) {
      this.btnInvoiceCopyClave.onclick = () => {
        if (claveAcceso && navigator.clipboard) {
          navigator.clipboard.writeText(claveAcceso).then(() => {
            this.showBanner('Clave de acceso copiada al portapapeles', 'success', 2500);
          }).catch(() => {
            prompt('Clave de acceso:', claveAcceso);
          });
        }
      };
    }

    if (this.btnInvoiceOpenFolder) {
      this.btnInvoiceOpenFolder.style.display = this.currentSavedPath ? 'inline-flex' : 'none';
      this.btnInvoiceOpenFolder.onclick = () => {
        if (this.currentSavedPath && this.api && typeof this.api.showItemInFolder === 'function') {
          this.api.showItemInFolder(this.currentSavedPath);
        }
      };
    }

    // Como ya está guardado en disco, el estado es 'saved'
    this._updateDownloadButtonsState(this.currentSavedPath ? 'saved' : false, 'xml');

    this.invoiceViewerBody.innerHTML = this._renderInvoiceRideHtml(item);
    this.invoiceViewerModal.classList.add('active');
  }

  /**
   * Abre la vista previa interceptada desde el SRI (PDF o XML)
   */
  async openInvoicePreview(previewData) {
    if (!previewData) return;

    if (!this.invoiceViewerModal) {
      this.invoiceViewerModal = document.getElementById('invoiceViewerModal');
      this.invoiceViewerBody = document.getElementById('invoiceViewerBody');
      this.invoiceViewerTitle = document.getElementById('invoiceViewerTitle');
      this.invViewerDocBadge = document.getElementById('invViewerDocBadge');
      this.invViewerSerie = document.getElementById('invViewerSerie');
      this.btnInvoicePrint = document.getElementById('btnInvoicePrint');
      this.btnInvoiceCopyClave = document.getElementById('btnInvoiceCopyClave');
      this.btnInvoiceOpenFolder = document.getElementById('btnInvoiceOpenFolder');
      this.btnInvoiceDownload = document.getElementById('btnInvoiceDownload');
      this.btnInvoiceDownloadLabel = document.getElementById('btnInvoiceDownloadLabel');
      this.btnFooterInvoiceDownload = document.getElementById('btnFooterInvoiceDownload');
      this.btnFooterInvoiceDownloadLabel = document.getElementById('btnFooterInvoiceDownloadLabel');
    }

    if (!this.invoiceViewerModal || !this.invoiceViewerBody) return;

    this.currentPreviewData = previewData;
    this.currentSavedPath = null;
    this.currentInvoiceClave = previewData.claveAcceso || '';

    // Estado inicial de botones: no guardado aún
    this._updateDownloadButtonsState(false, previewData.fileType);

    if (this.btnInvoiceOpenFolder) {
      this.btnInvoiceOpenFolder.style.display = 'none';
      this.btnInvoiceOpenFolder.onclick = () => {
        if (this.currentSavedPath && this.api && typeof this.api.showItemInFolder === 'function') {
          this.api.showItemInFolder(this.currentSavedPath);
        }
      };
    }

    if (this.btnInvoicePrint) {
      this.btnInvoicePrint.onclick = () => {
        window.print();
      };
    }

    if (this.btnInvoiceCopyClave) {
      this.btnInvoiceCopyClave.style.display = this.currentInvoiceClave ? 'inline-flex' : 'none';
      this.btnInvoiceCopyClave.onclick = () => {
        if (this.currentInvoiceClave && navigator.clipboard) {
          navigator.clipboard.writeText(this.currentInvoiceClave).then(() => {
            this.showBanner('Clave de acceso copiada al portapapeles', 'success', 2500);
          }).catch(() => {
            prompt('Clave de acceso:', this.currentInvoiceClave);
          });
        }
      };
    }

    if (previewData.fileType === 'pdf') {
      // Vista previa de PDF
      if (this.invoiceViewerTitle) {
        this.invoiceViewerTitle.textContent = 'Vista Previa de Comprobante (RIDE PDF)';
      }
      if (this.invViewerDocBadge) {
        this.invViewerDocBadge.textContent = 'RIDE PDF';
      }
      if (this.invViewerSerie) {
        this.invViewerSerie.textContent = previewData.serie || previewData.fileName || 'Comprobante PDF';
      }

      const fileUrl = 'file:///' + (previewData.tempPath || '').replace(/\\/g, '/');
      this.invoiceViewerBody.innerHTML = `
        <div class="invoice-pdf-wrapper">
          <iframe src="${fileUrl}" class="invoice-pdf-frame" title="RIDE PDF Oficial SRI"></iframe>
        </div>
      `;
    } else {
      // Vista previa de XML
      let item = previewData.parsedItem;
      if (!item && previewData.tempPath && this.api && typeof this.api.parseSingleXml === 'function') {
        try {
          item = await this.api.parseSingleXml(previewData.tempPath);
        } catch (e) {
          console.error('Error parseando XML temporal:', e);
        }
      }

      if (item && item.success !== false) {
        this.currentPreviewData.parsedItem = item;
        const clave = item.claveAcceso || item.numeroAutorizacion || previewData.claveAcceso || '';
        this.currentInvoiceClave = clave;

        if (this.invoiceViewerTitle) {
          this.invoiceViewerTitle.textContent = `${item.tipoDocNombre || 'Factura'} Electrónica`;
        }
        if (this.invViewerDocBadge) {
          this.invViewerDocBadge.textContent = (item.tipoDocNombre || 'FACTURA').toUpperCase();
        }
        if (this.invViewerSerie) {
          this.invViewerSerie.textContent = `Nº ${item.serie || '000-000-000000000'}`;
        }
        if (this.btnInvoiceCopyClave) {
          this.btnInvoiceCopyClave.style.display = clave ? 'inline-flex' : 'none';
        }

        this.invoiceViewerBody.innerHTML = this._renderInvoiceRideHtml(item);
      } else {
        if (this.invoiceViewerTitle) {
          this.invoiceViewerTitle.textContent = 'Comprobante Electrónico (XML)';
        }
        if (this.invViewerDocBadge) {
          this.invViewerDocBadge.textContent = 'XML';
        }
        if (this.invViewerSerie) {
          this.invViewerSerie.textContent = previewData.fileName || '';
        }
        this.invoiceViewerBody.innerHTML = `
          <div class="alert alert-info" style="margin: 30px auto; max-width: 600px; padding: 20px; background: white; border-radius: 8px;">
            <h4 style="margin-top:0;">Archivo XML descargado para vista previa</h4>
            <p>Nombre: <strong>${this._escapeHtml(previewData.fileName || '')}</strong></p>
            <p>Puedes descargarlo a tu carpeta o imprimirlo utilizando los botones superiores.</p>
          </div>
        `;
      }
    }

    this.invoiceViewerModal.classList.add('active');
  }

  /**
   * Ejecuta la descarga del archivo comprobante que se está visualizando
   */
  async downloadCurrentPreview() {
    if (!this.currentPreviewData || !this.currentPreviewData.tempPath) {
      if (this.currentSavedPath) {
        this.showBanner('El comprobante ya se encuentra guardado en disco', 'info', 2500);
      }
      return;
    }

    try {
      this._updateDownloadButtonsState('loading', this.currentPreviewData.fileType);

      const client = this.getActiveClient() || this.currentPreviewData.client;
      const res = await this.api.savePreviewFile({
        tempPath: this.currentPreviewData.tempPath,
        fileName: this.currentPreviewData.fileName,
        client: client,
        category: this.currentPreviewData.category || (this.filterCategory ? this.filterCategory.value : 'Compras'),
        year: this.currentPreviewData.year,
        month: this.currentPreviewData.month,
        claveAcceso: this.currentInvoiceClave
      });

      if (res && res.success) {
        this.currentSavedPath = res.savedPath;
        this._updateDownloadButtonsState('saved', this.currentPreviewData.fileType);

        if (this.btnInvoiceOpenFolder) {
          this.btnInvoiceOpenFolder.style.display = 'inline-flex';
        }

        this.showBanner(`Comprobante guardado exitosamente en: ${res.fileName}`, 'success', 3500);
      } else {
        this._updateDownloadButtonsState(false, this.currentPreviewData.fileType);
        this.showBanner('No se pudo guardar el archivo.', 'warning', 3500);
      }
    } catch (err) {
      console.error('Error guardando comprobante:', err);
      this._updateDownloadButtonsState(false, this.currentPreviewData.fileType);
      this.showBanner('Error guardando comprobante: ' + (err.message || err), 'warning', 3500);
    }
  }

  /**
   * Actualiza el estado visual y textos de los botones de descarga del modal
   */
  _updateDownloadButtonsState(status, fileType = 'xml') {
    const isPdf = fileType === 'pdf';
    const typeLabel = isPdf ? 'PDF' : 'XML';

    if (status === 'saved') {
      if (this.btnInvoiceDownload) {
        this.btnInvoiceDownload.classList.add('saved');
        this.btnInvoiceDownload.disabled = false;
      }
      if (this.btnInvoiceDownloadLabel) {
        this.btnInvoiceDownloadLabel.textContent = 'Guardado';
      }
      if (this.btnFooterInvoiceDownload) {
        this.btnFooterInvoiceDownload.disabled = false;
        this.btnFooterInvoiceDownload.classList.remove('btn-success');
        this.btnFooterInvoiceDownload.classList.add('btn-secondary');
      }
      if (this.btnFooterInvoiceDownloadLabel) {
        this.btnFooterInvoiceDownloadLabel.textContent = `Comprobante Guardado (${typeLabel})`;
      }
    } else if (status === 'loading') {
      if (this.btnInvoiceDownload) this.btnInvoiceDownload.disabled = true;
      if (this.btnInvoiceDownloadLabel) this.btnInvoiceDownloadLabel.textContent = 'Guardando...';
      if (this.btnFooterInvoiceDownload) this.btnFooterInvoiceDownload.disabled = true;
      if (this.btnFooterInvoiceDownloadLabel) this.btnFooterInvoiceDownloadLabel.textContent = 'Guardando...';
    } else {
      if (this.btnInvoiceDownload) {
        this.btnInvoiceDownload.classList.remove('saved');
        this.btnInvoiceDownload.disabled = false;
      }
      if (this.btnInvoiceDownloadLabel) {
        this.btnInvoiceDownloadLabel.textContent = `Descargar ${typeLabel}`;
      }
      if (this.btnFooterInvoiceDownload) {
        this.btnFooterInvoiceDownload.disabled = false;
        this.btnFooterInvoiceDownload.classList.add('btn-success');
        this.btnFooterInvoiceDownload.classList.remove('btn-secondary');
      }
      if (this.btnFooterInvoiceDownloadLabel) {
        this.btnFooterInvoiceDownloadLabel.textContent = `Descargar Comprobante (${typeLabel})`;
      }
    }
  }

  closeInvoiceViewer() {
    if (this.invoiceViewerModal) {
      this.invoiceViewerModal.classList.remove('active');
    }
  }

  /**
   * Genera el código de barras SVG oficial en formato Code 128 (Subset C) para la clave de acceso del SRI
   */
  _generateBarcodeSvg(text) {
    const patterns = [
      '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
      '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
      '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
      '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
      '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
      '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
      '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
      '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
      '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
      '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
      '114131','311141','411131','211412','211214','211232','2331112'
    ];

    const digits = String(text || '').replace(/\D/g, '');
    if (!digits) return '';

    const codes = [105]; // Start Code C
    let i = 0;
    while (i < digits.length) {
      if (i + 1 < digits.length) {
        codes.push(parseInt(digits.substr(i, 2), 10));
        i += 2;
      } else {
        codes.push(100); // Code B para el último dígito impar
        codes.push(digits.charCodeAt(i) - 32);
        i += 1;
      }
    }

    let checksum = codes[0];
    for (let idx = 1; idx < codes.length; idx++) {
      checksum += codes[idx] * idx;
    }
    codes.push(checksum % 103);
    codes.push(106); // Stop

    let barStr = '';
    for (const c of codes) {
      barStr += patterns[c] || '';
    }

    let x = 0;
    let svgPaths = '';
    const height = 38;
    for (let b = 0; b < barStr.length; b++) {
      const width = parseInt(barStr[b], 10);
      if (b % 2 === 0) {
        svgPaths += `<rect x="${x}" y="0" width="${width}" height="${height}" fill="#000000"/>`;
      }
      x += width;
    }

    return `<svg viewBox="0 0 ${x} ${height}" width="100%" height="${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 4px 0;">${svgPaths}</svg>`;
  }

  /**
   * Renderiza el RIDE oficial exactamente con la estructura, bordes negros y simplicidad del SRI
   */
  _renderInvoiceRideHtml(item) {
    const emisor = item.emisor || {};
    const comprador = item.comprador || {};
    const valores = item.valores || {};
    const detalles = Array.isArray(item.detalles) ? item.detalles : [];
    const infoAdicional = item.infoAdicional || {};

    const formasPagoDesc = {
      '01': 'SIN UTILIZACION DEL SISTEMA FINANCIERO',
      '15': 'COMPENSACION DE DEUDAS',
      '16': 'TARJETA DE DEBITO',
      '17': 'DINERO ELECTRONICO',
      '18': 'TARJETA PREPAGO',
      '19': 'TARJETA DE CREDITO',
      '20': 'OTROS CON UTILIZACION DEL SISTEMA FINANCIERO',
      '21': 'ENDOSO DE TITULOS'
    };

    const tarifaIva = valores.tarifaIvaPorcentaje || 15;
    const subtotalSinImp = typeof valores.totalSinImpuestos === 'number'
      ? valores.totalSinImpuestos
      : ((valores.baseGravada || 0) + (valores.base0 || 0) + (valores.baseNoObjeto || 0) + (valores.baseExenta || 0));

    // Código de barras SRI
    const claveAcceso = item.claveAcceso || item.numeroAutorizacion || '';
    const barcodeSvg = this._generateBarcodeSvg(claveAcceso);

    // Filas de la tabla de detalles
    let itemsRows = '';
    if (detalles.length > 0) {
      itemsRows = detalles.map(d => `
        <tr>
          <td style="font-family: ui-monospace, monospace; font-size: 10.5px;">${this._escapeHtml(d.codigo || d.codigoPrincipal || '-')}</td>
          <td style="text-align: center;">${(d.cantidad || 1).toFixed(2)}</td>
          <td>${this._escapeHtml(d.descripcion || 'Sin descripción')}</td>
          <td style="text-align: right; font-family: ui-monospace, monospace;">$${(d.precioUnitario || 0).toFixed(2)}</td>
          <td style="text-align: right; font-family: ui-monospace, monospace;">$${(d.descuento || 0).toFixed(2)}</td>
          <td style="text-align: right; font-weight: 600; font-family: ui-monospace, monospace;">$${(d.precioTotal || d.precioTotalSinImpuesto || 0).toFixed(2)}</td>
        </tr>
      `).join('');
    } else {
      itemsRows = `
        <tr>
          <td style="font-family: ui-monospace, monospace; font-size: 10.5px;">001</td>
          <td style="text-align: center;">1.00</td>
          <td>CONSUMO / ADQUISICIÓN SEGÚN FACTURA ELECTRÓNICA</td>
          <td style="text-align: right; font-family: ui-monospace, monospace;">$${subtotalSinImp.toFixed(2)}</td>
          <td style="text-align: right; font-family: ui-monospace, monospace;">$0.00</td>
          <td style="text-align: right; font-weight: 600; font-family: ui-monospace, monospace;">$${subtotalSinImp.toFixed(2)}</td>
        </tr>
      `;
    }

    // Información adicional
    const infoKeys = Object.keys(infoAdicional);
    let infoAdicionalHtml = '';
    if (infoKeys.length > 0) {
      infoAdicionalHtml = `
        <div class="ride-sri-box" style="padding: 8px; margin-bottom: 8px;">
          <div class="ride-section-heading">Información Adicional</div>
          <table class="ride-subtable">
            <tbody>
              ${infoKeys.map(k => `
                <tr>
                  <td style="width: 35%; font-weight: 600;">${this._escapeHtml(k)}:</td>
                  <td>${this._escapeHtml(infoAdicional[k])}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Formas de pago
    const pagosList = Array.isArray(item.pagos) && item.pagos.length > 0
      ? item.pagos
      : [{
          formaPago: item.formaPago || '20',
          total: valores.total || 0,
          plazo: '0',
          unidadTiempo: 'días'
        }];

    const pagosRows = pagosList.map(p => {
      const desc = formasPagoDesc[p.formaPago] || 'OTROS CON UTILIZACION DEL SISTEMA FINANCIERO';
      return `
        <tr>
          <td>${this._escapeHtml(p.formaPago)} - ${this._escapeHtml(desc)}</td>
          <td style="text-align: right; font-family: ui-monospace, monospace;">$${(p.total || 0).toFixed(2)}</td>
          <td style="text-align: center;">${this._escapeHtml(p.plazo || '0')}</td>
          <td style="text-align: center;">${this._escapeHtml(p.unidadTiempo || 'días')}</td>
        </tr>
      `;
    }).join('');

    // Régimen o Agente de Retención
    let emisorRegimenHtml = '';
    const regimenVal = emisor.regimen || infoAdicional['Regimen'] || infoAdicional['Régimen'];
    if (regimenVal) {
      emisorRegimenHtml += `<div class="ride-info-line"><strong>Régimen:</strong> ${this._escapeHtml(regimenVal)}</div>`;
    }
    const agenteVal = emisor.agenteRetencion || infoAdicional['Agente de Retención'] || infoAdicional['Agente de Retencion'];
    if (agenteVal) {
      emisorRegimenHtml += `<div class="ride-info-line"><strong>Agente de Retención Resolución:</strong> ${this._escapeHtml(agenteVal)}</div>`;
    }

    return `
      <div class="ride-paper-sheet">
        <!-- 1. Cabecera SRI en 2 columnas -->
        <div class="ride-sri-header-grid">
          <!-- Columna Izquierda: Datos del Emisor -->
          <div class="ride-sri-box ride-emisor-box">
            <div class="ride-emisor-title">${this._escapeHtml(emisor.razonSocial || 'EMISOR')}</div>
            ${emisor.nombreComercial && emisor.nombreComercial !== emisor.razonSocial ? `<div class="ride-emisor-trade">${this._escapeHtml(emisor.nombreComercial)}</div>` : ''}
            <div class="ride-info-line"><strong>Matriz:</strong> ${this._escapeHtml(emisor.dirMatriz || 'No registrada')}</div>
            <div class="ride-info-line"><strong>Sucursal:</strong> ${this._escapeHtml(emisor.dirEstablecimiento || emisor.dirMatriz || 'Matriz')}</div>
            ${emisor.contribuyenteEspecial ? `<div class="ride-info-line"><strong>Contribuyente Especial Nro:</strong> ${this._escapeHtml(emisor.contribuyenteEspecial)}</div>` : ''}
            <div class="ride-info-line"><strong>OBLIGADO A LLEVAR CONTABILIDAD:</strong> ${this._escapeHtml(emisor.obligadoContabilidad || 'NO')}</div>
            ${emisorRegimenHtml}
          </div>

          <!-- Columna Derecha: Datos Oficiales de la Factura y SRI -->
          <div class="ride-sri-box ride-fiscal-box">
            <div class="ride-ruc-title"><strong>R.U.C.:</strong> <span class="ride-ruc-num">${this._escapeHtml(emisor.ruc || '')}</span></div>
            <div class="ride-doc-title">${this._escapeHtml((item.tipoDocNombre || 'FACTURA').toUpperCase())}</div>
            <div class="ride-doc-num">No. ${this._escapeHtml(item.serie || '001-001-000000001')}</div>
            <div class="ride-field-label">NÚMERO DE AUTORIZACIÓN:</div>
            <div class="ride-auth-val">${this._escapeHtml(item.claveAcceso || item.numeroAutorizacion || '')}</div>
            <div class="ride-meta-line"><strong>FECHA Y HORA DE AUTORIZACIÓN:</strong> ${this._escapeHtml(item.fechaAutorizacion || item.fechaEmision || '')}</div>
            <div class="ride-meta-line"><strong>AMBIENTE:</strong> PRODUCCIÓN &nbsp;&nbsp; <strong>EMISIÓN:</strong> NORMAL</div>
            <div class="ride-field-label" style="margin-top: 6px;">CLAVE DE ACCESO:</div>
            ${barcodeSvg}
            <div class="ride-clave-digits">${this._escapeHtml(claveAcceso)}</div>
          </div>
        </div>

        <!-- 2. Franja del Comprador -->
        <div class="ride-sri-box ride-buyer-box">
          <div class="ride-buyer-grid">
            <div><strong>Razón Social / Nombres y Apellidos:</strong> ${this._escapeHtml(comprador.razonSocial || 'CONSUMIDOR FINAL')}</div>
            <div><strong>Identificación:</strong> ${this._escapeHtml(comprador.identificacion || '9999999999999')}</div>
            <div><strong>Fecha Emisión:</strong> ${this._escapeHtml(item.fechaEmision || '')}</div>
            <div><strong>Guía Remisión:</strong> ${this._escapeHtml(item.guiaRemision || 'N/A')}</div>
            <div style="grid-column: 1 / -1;"><strong>Dirección:</strong> ${this._escapeHtml(comprador.direccion || 'S/N')}</div>
          </div>
        </div>

        <!-- 3. Tabla de Detalles / Productos -->
        <table class="ride-sri-table">
          <thead>
            <tr>
              <th style="width: 12%;">Cod. Principal</th>
              <th style="width: 8%; text-align: center;">Cant.</th>
              <th style="width: 48%;">Descripción</th>
              <th style="width: 10%; text-align: right;">Precio Unitario</th>
              <th style="width: 10%; text-align: right;">Descuento</th>
              <th style="width: 12%; text-align: right;">Precio Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- 4. Sección Inferior: Información Adicional, Pagos y Totales -->
        <div class="ride-bottom-layout">
          <!-- Columna Izquierda: Información Adicional y Formas de Pago -->
          <div class="ride-bottom-left">
            ${infoAdicionalHtml}

            <div class="ride-sri-box" style="padding: 8px;">
              <div class="ride-section-heading">Forma de Pago</div>
              <table class="ride-subtable">
                <thead>
                  <tr>
                    <th>Forma de Pago</th>
                    <th style="text-align: right;">Total</th>
                    <th style="text-align: center;">Plazo</th>
                    <th style="text-align: center;">Tiempo</th>
                  </tr>
                </thead>
                <tbody>
                  ${pagosRows}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Columna Derecha: Totales Oficiales SRI -->
          <div class="ride-bottom-right">
            <table class="ride-totals-sri-table">
              <tbody>
                <tr>
                  <td>SUBTOTAL ${tarifaIva}%:</td>
                  <td class="val">$${(valores.baseGravada || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>SUBTOTAL 0%:</td>
                  <td class="val">$${(valores.base0 || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>SUBTOTAL NO OBJETO DE IVA:</td>
                  <td class="val">$${(valores.baseNoObjeto || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>SUBTOTAL EXENTO DE IVA:</td>
                  <td class="val">$${(valores.baseExenta || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>SUBTOTAL SIN IMPUESTOS:</td>
                  <td class="val">$${subtotalSinImp.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>TOTAL DESCUENTO:</td>
                  <td class="val">$${(valores.totalDescuento || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>ICE:</td>
                  <td class="val">$${(valores.montoIce || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>IVA ${tarifaIva}%:</td>
                  <td class="val">$${(valores.montoIva || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>PROPINA:</td>
                  <td class="val">$${(valores.propina || 0).toFixed(2)}</td>
                </tr>
                <tr class="ride-total-row">
                  <td>VALOR TOTAL:</td>
                  <td class="val">$${(valores.total || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // MÓDULO DE CONCILIACIÓN TRIBUTARIA (PUNTO G: ATS VS FORMULARIOS SRI)
  // =========================================================================

  async openReconciliationModal() {
    const client = this.getActiveClient();
    if (!client || !client.defaultFolder) {
      if (typeof this.showBanner === 'function') {
        this.showBanner('Selecciona un cliente para iniciar la conciliación tributaria.', 'warning');
      }
      return;
    }

    const year = this.state.year || (this.filterYear ? this.filterYear.value : String(new Date().getFullYear()));
    const month = this.state.month || (this.filterMonth ? this.filterMonth.value : '01');

    try {
      if (typeof this.showBanner === 'function') {
        this.showBanner('Cargando y conciliando transacciones del período...', 'info');
      }

      // Cargar Compras del período
      let compras = [];
      let retEmitidas = [];
      try {
        const cRes = await this.api.loadPeriodXmls({
          clientFolder: client.defaultFolder,
          category: 'Compras',
          year,
          month
        });
        compras = (cRes && cRes.items) || [];
        retEmitidas = (cRes && cRes.retenciones) || [];
      } catch (e) {
        console.warn('Aviso cargando compras para conciliación:', e);
      }

      // Cargar Ventas del período
      let ventas = [];
      let retRecibidas = [];
      try {
        const vRes = await this.api.loadPeriodXmls({
          clientFolder: client.defaultFolder,
          category: 'Ventas',
          year,
          month
        });
        ventas = (vRes && vRes.items) || [];
        retRecibidas = (vRes && vRes.retenciones) || [];
      } catch (e) {
        console.warn('Aviso cargando ventas para conciliación:', e);
      }

      // Ejecutar conciliación con motor de negocio
      const recResult = await this.api.reconcileAtsWithDeclaraciones({
        compras,
        ventas,
        retencionesEmitidas: retEmitidas,
        retencionesRecibidas: retRecibidas
      });

      this.currentReconciliation = recResult;
      this._renderReconciliationF104(recResult.form104.rows, recResult.form104.resumen);
      this._renderReconciliationF103(recResult.form103.airRows, recResult.form103.retencionesIvaEmitidas, recResult.form103.resumen);
      this._updateReconciliationSummaryBadge();

      if (this.atsReconciliationModal) {
        this.atsReconciliationModal.classList.add('active');
      }
    } catch (err) {
      if (typeof this.showBanner === 'function') {
        this.showBanner(`Error en conciliación tributaria: ${err.message}`, 'error');
      }
    }
  }

  _renderReconciliationF104(rows, resumen) {
    if (this.recKpiVentasGrav) this.recKpiVentasGrav.textContent = `$${(resumen.totalVentasNetas || 0).toFixed(2)}`;
    if (this.recKpiIvaVentas) this.recKpiIvaVentas.textContent = `$${(resumen.ivaVentasGenerado || 0).toFixed(2)}`;
    if (this.recKpiComprasGrav) this.recKpiComprasGrav.textContent = `$${(resumen.totalComprasNetas || 0).toFixed(2)}`;
    if (this.recKpiIvaCompras) this.recKpiIvaCompras.textContent = `$${(resumen.ivaComprasCausado || 0).toFixed(2)}`;

    if (!this.atsReconcileF104Body) return;
    this.atsReconcileF104Body.innerHTML = '';

    rows.forEach(r => {
      const tr = document.createElement('tr');
      const badgeCls = r.isBalanced ? 'badge-success' : 'badge-danger';
      const badgeTxt = r.isBalanced ? 'Cuadrado' : 'Discrepancia';
      const diffColor = r.isBalanced ? '#16a34a' : '#dc2626';

      tr.innerHTML = `
        <td style="text-align: center; font-weight: 700; color: #1e40af;">${r.casillero}</td>
        <td style="font-weight: 500;">${this._escapeHtml(r.descripcion)}</td>
        <td style="text-align: right; font-weight: 600; font-variant-numeric: tabular-nums;">$${r.atsCalculado.toFixed(2)}</td>
        <td style="text-align: right;">
          <input type="number" step="0.01" class="rec-f104-input ats-select" data-casillero="${r.casillero}" value="${r.declarado.toFixed(2)}" style="width: 105px; text-align: right; height: 26px; padding: 2px 6px; font-weight: 600;">
        </td>
        <td style="text-align: right; font-weight: 700; color: ${diffColor}; font-variant-numeric: tabular-nums;" id="recDiffF104_${r.casillero}">
          $${r.diferencia.toFixed(2)}
        </td>
        <td style="text-align: center;">
          <span class="badge ${badgeCls}" id="recBadgeF104_${r.casillero}" style="padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">
            ${badgeTxt}
          </span>
        </td>
      `;

      const input = tr.querySelector('.rec-f104-input');
      input.addEventListener('input', () => {
        const val = parseFloat(input.value) || 0.0;
        const diff = Math.round(((r.atsCalculado - val) + Number.EPSILON) * 100) / 100;
        const isOk = Math.abs(diff) < 0.01;

        const diffEl = document.getElementById(`recDiffF104_${r.casillero}`);
        const badgeEl = document.getElementById(`recBadgeF104_${r.casillero}`);

        if (diffEl) {
          diffEl.textContent = `$${diff.toFixed(2)}`;
          diffEl.style.color = isOk ? '#16a34a' : '#dc2626';
        }
        if (badgeEl) {
          badgeEl.className = `badge ${isOk ? 'badge-success' : 'badge-danger'}`;
          badgeEl.textContent = isOk ? 'Cuadrado' : 'Discrepancia';
        }
        this._updateReconciliationSummaryBadge();
      });

      this.atsReconcileF104Body.appendChild(tr);
    });
  }

  _renderReconciliationF103(airRows, ivaEmitidas, resumen) {
    if (this.recKpiTotalAir) this.recKpiTotalAir.textContent = `$${(resumen.totalRentaRetenido || 0).toFixed(2)}`;
    if (this.recKpiTotalRetIva) this.recKpiTotalRetIva.textContent = `$${(resumen.totalIvaRetenido || 0).toFixed(2)}`;
    if (this.recKpiTotalF103) this.recKpiTotalF103.textContent = `$${(resumen.totalPagarF103 || 0).toFixed(2)}`;

    if (!this.atsReconcileF103Body) return;
    this.atsReconcileF103Body.innerHTML = '';

    if (airRows.length === 0) {
      this.atsReconcileF103Body.innerHTML = `
        <tr>
          <td colspan="8" class="table-empty-cell" style="padding: 18px; text-align: center; color: var(--muted-foreground);">
            No se detectaron retenciones en la fuente de Impuesto a la Renta (AIR) emitidas en este período.
          </td>
        </tr>
      `;
      return;
    }

    airRows.forEach(item => {
      const tr = document.createElement('tr');
      const badgeCls = item.isBalanced ? 'badge-success' : 'badge-danger';
      const badgeTxt = item.isBalanced ? 'Cuadrado' : 'Discrepancia';
      const diffColor = item.isBalanced ? '#16a34a' : '#dc2626';

      tr.innerHTML = `
        <td style="text-align: center; font-weight: 700; color: #1e40af;">${item.codigo}</td>
        <td style="font-weight: 500;">${this._escapeHtml(item.concepto)}</td>
        <td style="text-align: center; font-weight: 600;">${item.porcentaje}%</td>
        <td style="text-align: right; font-weight: 600; font-variant-numeric: tabular-nums;">$${item.baseImponible.toFixed(2)}</td>
        <td style="text-align: right; font-weight: 700; color: #1e40af; font-variant-numeric: tabular-nums;">$${item.valorRetenidoAts.toFixed(2)}</td>
        <td style="text-align: right;">
          <input type="number" step="0.01" class="rec-f103-input ats-select" data-codigo="${item.codigo}" value="${item.declarado.toFixed(2)}" style="width: 105px; text-align: right; height: 26px; padding: 2px 6px; font-weight: 600;">
        </td>
        <td style="text-align: right; font-weight: 700; color: ${diffColor}; font-variant-numeric: tabular-nums;" id="recDiffF103_${item.codigo}">
          $${item.diferencia.toFixed(2)}
        </td>
        <td style="text-align: center;">
          <span class="badge ${badgeCls}" id="recBadgeF103_${item.codigo}" style="padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">
            ${badgeTxt}
          </span>
        </td>
      `;

      const input = tr.querySelector('.rec-f103-input');
      input.addEventListener('input', () => {
        const val = parseFloat(input.value) || 0.0;
        const diff = Math.round(((item.valorRetenidoAts - val) + Number.EPSILON) * 100) / 100;
        const isOk = Math.abs(diff) < 0.01;

        const diffEl = document.getElementById(`recDiffF103_${item.codigo}`);
        const badgeEl = document.getElementById(`recBadgeF103_${item.codigo}`);

        if (diffEl) {
          diffEl.textContent = `$${diff.toFixed(2)}`;
          diffEl.style.color = isOk ? '#16a34a' : '#dc2626';
        }
        if (badgeEl) {
          badgeEl.className = `badge ${isOk ? 'badge-success' : 'badge-danger'}`;
          badgeEl.textContent = isOk ? 'Cuadrado' : 'Discrepancia';
        }
        this._updateReconciliationSummaryBadge();
      });

      this.atsReconcileF103Body.appendChild(tr);
    });
  }

  _updateReconciliationSummaryBadge() {
    if (!this.recFooterStatus) return;
    let discCount = 0;
    const diffs = document.querySelectorAll('.modal-body .badge-danger');
    if (diffs) discCount = diffs.length;

    if (discCount === 0) {
      this.recFooterStatus.innerHTML = '<span style="color: #16a34a; font-weight: 700;">Conciliación Impecable:</span> Todas las cifras del ATS coinciden exactamente con la declaración SRI (Diferencia $0.00).';
    } else {
      this.recFooterStatus.innerHTML = `<span style="color: #dc2626; font-weight: 700;">Atención Contable:</span> Se detectaron ${discCount} discrepancia(s) entre el ATS y los valores declarados.`;
    }
  }

  autofillReconciliationFromAts() {
    if (!this.currentReconciliation) return;
    const f104Inputs = document.querySelectorAll('.rec-f104-input');
    f104Inputs.forEach(inp => {
      const c = inp.getAttribute('data-casillero');
      const row = (this.currentReconciliation.form104.rows || []).find(r => r.casillero === c);
      if (row) {
        inp.value = row.atsCalculado.toFixed(2);
        inp.dispatchEvent(new Event('input'));
      }
    });

    const f103Inputs = document.querySelectorAll('.rec-f103-input');
    f103Inputs.forEach(inp => {
      const cod = inp.getAttribute('data-codigo');
      const item = (this.currentReconciliation.form103.airRows || []).find(r => r.codigo === cod);
      if (item) {
        inp.value = item.valorRetenidoAts.toFixed(2);
        inp.dispatchEvent(new Event('input'));
      }
    });

    if (typeof this.showBanner === 'function') {
      this.showBanner('Valores sugeridos del ATS transferidos a todos los casilleros.', 'info');
    }
  }

  printReconciliationReport() {
    const client = this.getActiveClient();
    const periodStr = `${this._getMonthLabel(this.state.month)} ${this.state.year}`;
    const clientName = client ? (client.razonSocial || client.name) : 'CONTRIBUYENTE';
    const clientRuc = client ? client.ruc : '0000000000001';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Habilita las ventanas emergentes para imprimir el reporte de conciliación.');
      return;
    }

    const f104TableHtml = this.atsReconcileF104Body ? this.atsReconcileF104Body.parentElement.outerHTML : '';
    const f103TableHtml = this.atsReconcileF103Body ? this.atsReconcileF103Body.parentElement.outerHTML : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Acta de Conciliación Tributaria - ${clientRuc} - ${periodStr}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #0f172a; margin: 30px; }
          h2, h3 { margin: 0 0 6px 0; }
          .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
          th { background: #f1f5f9; text-align: left; }
          input { border: none; background: transparent; font-weight: bold; width: 80px; text-align: right; }
          .badge { font-weight: bold; padding: 2px 6px; }
          .badge-success { color: #16a34a; }
          .badge-danger { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <h2>TRIBU - Acta de Conciliación Tributaria ATS vs Declaraciones SRI</h2>
          <div><strong>Contribuyente:</strong> ${clientName} | <strong>RUC:</strong> ${clientRuc}</div>
          <div><strong>Período Fiscal:</strong> ${periodStr} | <strong>Fecha de Emisión:</strong> ${new Date().toLocaleString('es-EC')}</div>
        </div>
        <h3>1. Formulario 104 - Impuesto al Valor Agregado (IVA)</h3>
        ${f104TableHtml}
        <h3>2. Formulario 103 - Retenciones en la Fuente de Impuesto a la Renta (AIR)</h3>
        ${f103TableHtml}
        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
          <div style="border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 5px;">Firma del Contador / Auditor</div>
          <div style="border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 5px;">Firma del Representante Legal</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  // =========================================================================
  // GESTIÓN DE COMPROBANTES FÍSICOS (NOTAS DE VENTA RIMPE, PEAJES, ETC.)
  // =========================================================================

  openPhysicalDocModal() {
    const client = this.getActiveClient();
    if (!client) {
      if (typeof this.showBanner === 'function') {
        this.showBanner('Selecciona un cliente antes de ingresar un comprobante físico.', 'warning');
      }
      return;
    }

    const year = this.state.year || (this.filterYear ? this.filterYear.value : String(new Date().getFullYear()));
    const month = this.state.month || (this.filterMonth ? this.filterMonth.value : '01');
    const monthNumMatch = String(month).match(/\b(\d{1,2})\b/);
    const monthNum = monthNumMatch ? monthNumMatch[1].padStart(2, '0') : '01';

    if (this.physFechaEmision) {
      this.physFechaEmision.value = `01/${monthNum}/${year}`;
    }
    if (this.physBase0) this.physBase0.value = '0.00';
    if (this.physBaseGravada) this.physBaseGravada.value = '0.00';
    if (this.physIva) this.physIva.value = '0.00';

    if (this.atsPhysicalDocModal) {
      this.atsPhysicalDocModal.classList.add('active');
    }
  }

  async savePhysicalDoc() {
    const client = this.getActiveClient();
    if (!client || !client.defaultFolder) return;

    const ruc = (this.physRuc ? this.physRuc.value : '').trim();
    const razonSocial = (this.physRazonSocial ? this.physRazonSocial.value : '').trim();
    const serie = (this.physSerie ? this.physSerie.value : '').trim();
    const fechaEmision = (this.physFechaEmision ? this.physFechaEmision.value : '').trim();
    const tipoDoc = this.physDocType ? this.physDocType.value : '02';
    const autorizacion = (this.physAutorizacion ? this.physAutorizacion.value : '').trim() || '1122334455';
    const base0 = parseFloat(this.physBase0 ? this.physBase0.value : 0) || 0;
    const baseGravada = parseFloat(this.physBaseGravada ? this.physBaseGravada.value : 0) || 0;
    const montoIva = parseFloat(this.physIva ? this.physIva.value : 0) || 0;
    const codSustento = this.physCodSustento ? this.physCodSustento.value : '02';
    const formaPago = this.physFormaPago ? this.physFormaPago.value : '01';

    if (!ruc || ruc.length < 10) {
      alert('Ingresa un RUC o Cédula válido para el proveedor.');
      return;
    }
    if (!razonSocial) {
      alert('Ingresa la Razón Social del proveedor.');
      return;
    }

    const year = this.state.year || (this.filterYear ? this.filterYear.value : String(new Date().getFullYear()));
    const month = this.state.month || (this.filterMonth ? this.filterMonth.value : '01');

    try {
      const res = await this.api.savePhysicalDoc({
        clientFolder: client.defaultFolder,
        docData: {
          tipoDoc,
          fechaEmision,
          ruc,
          razonSocial,
          serie,
          autorizacion,
          base0,
          baseGravada,
          montoIva,
          codSustento,
          formaPago,
          year,
          month
        }
      });

      if (res && res.success) {
        if (this.atsPhysicalDocModal) {
          this.atsPhysicalDocModal.classList.remove('active');
        }
        if (typeof this.showBanner === 'function') {
          this.showBanner('Comprobante físico guardado e integrado al ATS correctamente.', 'success');
        }
        await this.loadPeriodComprobantes();
      } else {
        alert('Error al guardar el comprobante físico: ' + (res ? res.error : 'Desconocido'));
      }
    } catch (err) {
      alert('Error guardando comprobante: ' + err.message);
    }
  }

  async deletePhysicalDoc(docId) {
    const client = this.getActiveClient();
    if (!client || !client.defaultFolder || !docId) return;

    if (!confirm('¿Estás seguro de eliminar este comprobante físico del período?')) return;

    try {
      const res = await this.api.deletePhysicalDoc({
        clientFolder: client.defaultFolder,
        docId
      });
      if (res && res.success) {
        if (typeof this.showBanner === 'function') {
          this.showBanner('Comprobante físico eliminado del período.', 'info');
        }
        await this.loadPeriodComprobantes();
      }
    } catch (err) {
      alert('Error eliminando comprobante: ' + err.message);
    }
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

// Exportar para su uso en la aplicación y pruebas
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AtsModuleView;
}
if (typeof window !== 'undefined') {
  window.AtsModuleView = AtsModuleView;
}
