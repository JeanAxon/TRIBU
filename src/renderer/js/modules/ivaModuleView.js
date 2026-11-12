/**
 * Controlador de Vista del Módulo de Declaración de IVA (Formulario 104)
 * TRIBU - Asistente Contable SRI Ecuador
 * 
 * Regla de estilo: Cero emojis en código, comentarios y salidas.
 */

class IvaModuleView {
  constructor() {
    this.client = null;
    this.clientFolder = null;
    this.periodsData = null;
    this.currentData = null;

    this.confirmaciones = {
      ventasEnCero: false,
      comprasEnCero: false,
      retencionesRecibidasEnCero: false,
      retencionesEmitidasEnCero: false
    };

    this.ajustesManuales = {
      c605: 0.0,
      c606: 0.0,
      c607: 0.0,
      c802: 0.0
    };

    this._bindElements();
    this._bindEvents();
  }

  _bindElements() {
    this.activeClientName = document.getElementById('ivaActiveClientName');
    this.filterYear = document.getElementById('ivaFilterYear');
    this.filterMonth = document.getElementById('ivaFilterMonth');
    this.integrityPill = document.getElementById('ivaIntegrityPill');
    this.integrityText = document.getElementById('ivaIntegrityText');

    // Checklist cards & badges
    this.badgeCompras = document.getElementById('badgeCompras');
    this.valComprasCount = document.getElementById('valComprasCount');
    this.valComprasTotal = document.getElementById('valComprasTotal');
    this.btnNavSriCompras = document.getElementById('btnNavSriCompras');
    this.btnConfirmComprasZero = document.getElementById('btnConfirmComprasZero');

    this.badgeVentas = document.getElementById('badgeVentas');
    this.valVentasCount = document.getElementById('valVentasCount');
    this.valVentasTotal = document.getElementById('valVentasTotal');
    this.btnNavSriVentas = document.getElementById('btnNavSriVentas');
    this.btnConfirmVentasZero = document.getElementById('btnConfirmVentasZero');

    this.badgeRetRecibidas = document.getElementById('badgeRetRecibidas');
    this.valRetRecibidasCount = document.getElementById('valRetRecibidasCount');
    this.valRetRecibidasTotal = document.getElementById('valRetRecibidasTotal');
    this.btnNavSriRetRecibidas = document.getElementById('btnNavSriRetRecibidas');
    this.btnConfirmRetRecibidasZero = document.getElementById('btnConfirmRetRecibidasZero');

    this.badgeRetEmitidas = document.getElementById('badgeRetEmitidas');
    this.valRetEmitidasCount = document.getElementById('valRetEmitidasCount');
    this.valRetEmitidasTotal = document.getElementById('valRetEmitidasTotal');
    this.btnNavSriRetEmitidas = document.getElementById('btnNavSriRetEmitidas');
    this.btnConfirmRetEmitidasZero = document.getElementById('btnConfirmRetEmitidasZero');

    // Executive summary cards
    this.sumVentasNetas = document.getElementById('sumVentasNetas');
    this.sumIvaGenerado = document.getElementById('sumIvaGenerado');
    this.sumComprasNetas = document.getElementById('sumComprasNetas');
    this.sumIvaAcreditable = document.getElementById('sumIvaAcreditable');
    this.sumRetencionesFavor = document.getElementById('sumRetencionesFavor');
    this.sumCreditoAnterior = document.getElementById('sumCreditoAnterior');
    this.cardResultadoFinal = document.getElementById('cardResultadoFinal');
    this.lblResultadoFinal = document.getElementById('lblResultadoFinal');
    this.sumResultadoMonto = document.getElementById('sumResultadoMonto');
    this.sumResultadoDesc = document.getElementById('sumResultadoDesc');

    // Action buttons
    this.btnIvaAbrirSri = document.getElementById('btnIvaAbrirSri');
    this.btnIvaRecalcular = document.getElementById('btnIvaRecalcular');
    this.btnIvaAjustesEspeciales = document.getElementById('btnIvaAjustesEspeciales');

    // Accordion
    this.btnToggleAccordion = document.getElementById('btnToggleCasillerosAccordion');
    this.accordionCaret = document.getElementById('accordionCaret');
    this.casillerosBody = document.getElementById('ivaCasillerosBody');
    this.tbodyCasilleros = document.getElementById('tbodyCasillerosFormulario');
    this.accordionCasillerosCount = document.getElementById('accordionCasillerosCount');

    // Modal de Ajustes
    this.modalAjustes = document.getElementById('ivaAjustesModal');
    this.btnCloseAjustes = document.getElementById('btnCloseIvaAjustesModal');
    this.btnCancelAjustes = document.getElementById('btnCancelIvaAjustes');
    this.btnSaveAjustes = document.getElementById('btnSaveIvaAjustes');
    this.inputC605 = document.getElementById('inputAjusteC605');
    this.inputC606 = document.getElementById('inputAjusteC606');
    this.inputC607 = document.getElementById('inputAjusteC607');
    this.inputC802 = document.getElementById('inputAjusteC802');
  }

  _bindEvents() {
    if (this.filterYear) {
      this.filterYear.addEventListener('change', () => this._onYearChange());
    }
    if (this.filterMonth) {
      this.filterMonth.addEventListener('change', () => this.loadPeriodData());
    }
    if (this.btnIvaRecalcular) {
      this.btnIvaRecalcular.addEventListener('click', () => this.loadPeriodData());
    }

    // Toggle Acordeón
    if (this.btnToggleAccordion) {
      this.btnToggleAccordion.addEventListener('click', () => this._toggleAccordion());
      this.btnToggleAccordion.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._toggleAccordion();
        }
      });
    }

    // Navegacion contextual al SRI desde el Checklist
    if (this.btnNavSriCompras) {
      this.btnNavSriCompras.addEventListener('click', () => {
        this._navigateToSriUrl('compras');
      });
    }
    if (this.btnNavSriVentas) {
      this.btnNavSriVentas.addEventListener('click', () => {
        this._navigateToSriUrl('ventas');
      });
    }
    if (this.btnNavSriRetRecibidas) {
      this.btnNavSriRetRecibidas.addEventListener('click', () => {
        this._navigateToSriUrl('compras');
      });
    }
    if (this.btnNavSriRetEmitidas) {
      this.btnNavSriRetEmitidas.addEventListener('click', () => {
        this._navigateToSriUrl('ventas');
      });
    }

    // Confirmaciones de $0
    if (this.btnConfirmComprasZero) {
      this.btnConfirmComprasZero.addEventListener('click', () => {
        this.confirmaciones.comprasEnCero = !this.confirmaciones.comprasEnCero;
        this.loadPeriodData();
      });
    }
    if (this.btnConfirmVentasZero) {
      this.btnConfirmVentasZero.addEventListener('click', () => {
        this.confirmaciones.ventasEnCero = !this.confirmaciones.ventasEnCero;
        this.loadPeriodData();
      });
    }
    if (this.btnConfirmRetRecibidasZero) {
      this.btnConfirmRetRecibidasZero.addEventListener('click', () => {
        this.confirmaciones.retencionesRecibidasEnCero = !this.confirmaciones.retencionesRecibidasEnCero;
        this.loadPeriodData();
      });
    }
    if (this.btnConfirmRetEmitidasZero) {
      this.btnConfirmRetEmitidasZero.addEventListener('click', () => {
        this.confirmaciones.retencionesEmitidasEnCero = !this.confirmaciones.retencionesEmitidasEnCero;
        this.loadPeriodData();
      });
    }

    // Abrir Formulario en SRI
    if (this.btnIvaAbrirSri) {
      this.btnIvaAbrirSri.addEventListener('click', () => {
        this._navigateToSriUrl('declaracion');
      });
    }

    // Modal de Ajustes
    if (this.btnIvaAjustesEspeciales) {
      this.btnIvaAjustesEspeciales.addEventListener('click', () => this._openAjustesModal());
    }
    if (this.btnCloseAjustes) {
      this.btnCloseAjustes.addEventListener('click', () => this._closeAjustesModal());
    }
    if (this.btnCancelAjustes) {
      this.btnCancelAjustes.addEventListener('click', () => this._closeAjustesModal());
    }
    if (this.btnSaveAjustes) {
      this.btnSaveAjustes.addEventListener('click', () => this._saveAjustesModal());
    }
  }

  setClient(client, clientFolder) {
    this.client = client;
    this.clientFolder = clientFolder;
    if (this.activeClientName) {
      this.activeClientName.textContent = client ? (client.razonSocial || client.ruc) : 'Sin cliente seleccionado';
    }
    this.confirmaciones = {
      ventasEnCero: false,
      comprasEnCero: false,
      retencionesRecibidasEnCero: false,
      retencionesEmitidasEnCero: false
    };
    this.initPeriods();
  }

  async initPeriods() {
    if (!this.client || !this.clientFolder) {
      this._renderEmptySelectors();
      return;
    }

    try {
      this.periodsData = await window.tribuApi.getAvailablePeriods(this.clientFolder);
      this._populateSelectors();
      await this.loadPeriodData();
    } catch (e) {
      console.warn('Error inicializando periodos para IVA:', e);
      this._renderDefaultSelectors();
      await this.loadPeriodData();
    }
  }

  _renderEmptySelectors() {
    if (this.filterYear) this.filterYear.innerHTML = '<option value="">Sin datos</option>';
    if (this.filterMonth) this.filterMonth.innerHTML = '<option value="">Sin datos</option>';
  }

  _renderDefaultSelectors() {
    const now = new Date();
    const curYear = String(now.getFullYear());
    let prevMonthNum = now.getMonth(); // Mes anterior (0-indexado)
    let yearToUse = curYear;
    if (prevMonthNum === 0) {
      prevMonthNum = 12;
      yearToUse = String(now.getFullYear() - 1);
    }

    const monthNames = [
      '01 - Enero', '02 - Febrero', '03 - Marzo', '04 - Abril',
      '05 - Mayo', '06 - Junio', '07 - Julio', '08 - Agosto',
      '09 - Septiembre', '10 - Octubre', '11 - Noviembre', '12 - Diciembre'
    ];

    if (this.filterYear) {
      this.filterYear.innerHTML = `<option value="${yearToUse}" selected>${yearToUse}</option>`;
    }
    if (this.filterMonth) {
      this.filterMonth.innerHTML = monthNames.map((m, idx) => {
        const val = String(idx + 1).padStart(2, '0');
        const isSel = (idx + 1) === prevMonthNum ? 'selected' : '';
        return `<option value="${val}" ${isSel}>${m}</option>`;
      }).join('');
    }
  }

  _populateSelectors() {
    if (!this.periodsData || !this.periodsData.years || this.periodsData.years.length === 0) {
      this._renderDefaultSelectors();
      return;
    }

    const years = this.periodsData.years;
    this.filterYear.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    this._onYearChange();
  }

  _onYearChange() {
    const selYear = this.filterYear ? this.filterYear.value : '';
    const monthsMap = this.periodsData && this.periodsData.monthsByYear ? this.periodsData.monthsByYear[selYear] : null;

    const allMonthNames = [
      '01 - Enero', '02 - Febrero', '03 - Marzo', '04 - Abril',
      '05 - Mayo', '06 - Junio', '07 - Julio', '08 - Agosto',
      '09 - Septiembre', '10 - Octubre', '11 - Noviembre', '12 - Diciembre'
    ];

    let monthsToRender = [];
    if (monthsMap && monthsMap.length > 0) {
      monthsToRender = monthsMap;
    } else {
      monthsToRender = allMonthNames;
    }

    this.filterMonth.innerHTML = monthsToRender.map(m => {
      const numMatch = String(m).match(/\d{1,2}/);
      const val = numMatch ? numMatch[0].padStart(2, '0') : m;
      return `<option value="${val}">${m}</option>`;
    }).join('');
  }

  async loadPeriodData() {
    if (!this.client || !this.clientFolder) {
      this._renderZeroState();
      return;
    }

    const year = this.filterYear ? this.filterYear.value : '';
    const month = this.filterMonth ? this.filterMonth.value : '';

    if (!year || !month) {
      this._renderZeroState();
      return;
    }

    this._setVerifyingState(true);

    try {
      const res = await window.tribuApi.getDeclaracionPeriodData({
        client: this.client,
        clientFolder: this.clientFolder,
        year,
        month,
        confirmaciones: this.confirmaciones,
        ajustesManuales: this.ajustesManuales
      });

      this._setVerifyingState(false);

      if (res && res.success) {
        this.currentData = res;
        this._renderDiagnosis(res.diagnostico);
        this._renderExecutiveSummary(res.resumenEjecutivo);
        this._renderCasillerosTable(res.casilleros);
      } else {
        console.warn('Respuesta no exitosa al cargar datos de IVA:', res);
        this._renderZeroState();
      }
    } catch (e) {
      console.error('Error cargando datos de declaración de IVA:', e);
      this._setVerifyingState(false);
      this._renderZeroState();
    }
  }

  _setVerifyingState(isVerifying) {
    if (!this.integrityPill) return;
    if (isVerifying) {
      this.integrityPill.className = 'iva-status-pill status-verifying';
      this.integrityText.textContent = 'Verificando comprobantes...';
    }
  }

  _renderDiagnosis(diag) {
    if (!diag) return;

    // Compras
    const comp = diag.compras;
    if (comp.ok) {
      this.badgeCompras.textContent = comp.confirmedEmpty ? 'Confirmado $0' : 'Disponible';
      this.badgeCompras.className = 'source-status-badge status-ok';
      this.btnConfirmComprasZero.textContent = comp.confirmedEmpty ? 'Deshacer $0' : 'Confirmar $0';
    } else {
      this.badgeCompras.textContent = 'Sin comprobantes';
      this.badgeCompras.className = 'source-status-badge status-warning';
      this.btnConfirmComprasZero.textContent = 'Confirmar $0';
    }
    this.valComprasCount.textContent = `${comp.count} facturas`;
    this.valComprasTotal.textContent = `$${comp.totalNeto.toFixed(2)} base neta`;

    // Ventas
    const ven = diag.ventas;
    if (ven.ok) {
      this.badgeVentas.textContent = ven.confirmedEmpty ? 'Confirmado $0' : 'Disponible';
      this.badgeVentas.className = 'source-status-badge status-ok';
      this.btnConfirmVentasZero.textContent = ven.confirmedEmpty ? 'Deshacer $0' : 'Confirmar $0';
    } else {
      this.badgeVentas.textContent = 'Sin comprobantes';
      this.badgeVentas.className = 'source-status-badge status-warning';
      this.btnConfirmVentasZero.textContent = 'Confirmar $0';
    }
    this.valVentasCount.textContent = `${ven.count} facturas`;
    this.valVentasTotal.textContent = `$${ven.totalNeto.toFixed(2)} base neta`;

    // Retenciones Recibidas
    const retRec = diag.retencionesRecibidas;
    if (retRec.ok) {
      this.badgeRetRecibidas.textContent = retRec.confirmedEmpty ? 'Confirmado $0' : `${retRec.count} retenciones`;
      this.badgeRetRecibidas.className = 'source-status-badge status-ok';
      this.btnConfirmRetRecibidasZero.textContent = retRec.confirmedEmpty ? 'Deshacer $0' : 'Confirmar $0';
    } else {
      this.badgeRetRecibidas.textContent = 'Sin retenciones';
      this.badgeRetRecibidas.className = 'source-status-badge status-neutral';
      this.btnConfirmRetRecibidasZero.textContent = 'Confirmar $0';
    }
    this.valRetRecibidasCount.textContent = `${retRec.count} recibidas`;
    this.valRetRecibidasTotal.textContent = `$${retRec.totalIvaRetenido.toFixed(2)} a favor`;

    // Retenciones Emitidas
    const retEmi = diag.retencionesEmitidas;
    this.badgeRetEmitidas.textContent = retEmi.confirmedEmpty ? 'No aplica' : (retEmi.count > 0 ? `${retEmi.count} emitidas` : '0 emitidas');
    this.badgeRetEmitidas.className = 'source-status-badge status-neutral';
    this.valRetEmitidasCount.textContent = `${retEmi.count} emitidas`;
    this.valRetEmitidasTotal.textContent = `$${retEmi.totalRetenidoAgente.toFixed(2)} retenido`;

    // Semáforo General
    if (diag.listoParaDeclarar) {
      this.integrityPill.className = 'iva-status-pill status-ready';
      this.integrityText.textContent = 'Borrador 100% Verificado';
    } else {
      this.integrityPill.className = 'iva-status-pill status-attention';
      this.integrityText.textContent = 'Verificación requerida (Faltan fuentes)';
    }
  }

  _renderExecutiveSummary(res) {
    if (!res) return;

    this.sumVentasNetas.textContent = `$${res.totalVentasNetas.toFixed(2)}`;
    this.sumIvaGenerado.textContent = `IVA Generado: $${res.ivaGeneradoVentas.toFixed(2)}`;

    this.sumComprasNetas.textContent = `$${res.totalComprasNetas.toFixed(2)}`;
    this.sumIvaAcreditable.textContent = `Crédito del mes: $${res.ivaAcreditableCompras.toFixed(2)}`;

    this.sumRetencionesFavor.textContent = `$${res.retencionesRecibidasPeriodo.toFixed(2)}`;
    this.sumCreditoAnterior.textContent = `Crédito mes anterior: $${res.creditoMesAnteriorTotal.toFixed(2)}`;

    if (res.resultadoTipo === 'A_PAGAR') {
      this.cardResultadoFinal.className = 'iva-summary-card result-card result-pay';
      this.lblResultadoFinal.textContent = 'Valor a Pagar al SRI';
      this.sumResultadoMonto.textContent = `$${res.valorPagar.toFixed(2)}`;
      this.sumResultadoDesc.textContent = 'Impuesto neto exigible en este período';
    } else if (res.resultadoTipo === 'SALDO_A_FAVOR') {
      this.cardResultadoFinal.className = 'iva-summary-card result-card result-credit';
      this.lblResultadoFinal.textContent = 'Saldo Crédito a Favor';
      this.sumResultadoMonto.textContent = `$${res.saldoFavorProximoMes.toFixed(2)}`;
      this.sumResultadoDesc.textContent = 'Crédito tributario acumulado para el próximo mes';
    } else {
      this.cardResultadoFinal.className = 'iva-summary-card result-card result-zero';
      this.lblResultadoFinal.textContent = 'Declaración en Cero';
      this.sumResultadoMonto.textContent = '$0.00';
      this.sumResultadoDesc.textContent = 'Sin impuesto causado ni saldos a pagar';
    }
  }

  _renderCasillerosTable(cas) {
    if (!this.tbodyCasilleros || !cas) return;

    const casillerosSpecs = [
      // Ventas
      { code: '111', desc: 'Comprobantes de venta emitidos', val: cas.c111, note: 'Conteo de facturas emitidas' },
      { code: '401', desc: 'Ventas locales gravadas tarifa diferente de cero (Bruto)', val: cas.c401, note: 'Suma de bases gravadas al 15%' },
      { code: '411', desc: 'Ventas locales gravadas tarifa diferente de cero (Neto)', val: cas.c411, note: 'Casillero 401 menos Notas de Crédito' },
      { code: '421', desc: 'Impuesto generado en ventas tarifa diferente de cero', val: cas.c421, note: '411 * 15%' },
      { code: '410', desc: 'Ventas locales materiales construcción tarifa 5%', val: cas.c410, note: 'Materiales Ley Eficiencia Económica' },
      { code: '420', desc: 'Impuesto generado materiales de construcción 5%', val: cas.c420, note: '410 * 5%' },
      { code: '403', desc: 'Ventas tarifa 0% sin derecho a crédito tributario', val: cas.c403, note: 'Servicios no gravados' },
      { code: '413', desc: 'Ventas tarifa 0% sin derecho a crédito tributario (Neto)', val: cas.c413, note: '403 menos NCs' },
      { code: '409', desc: 'TOTAL VENTAS Y OTRAS OPERACIONES (Bruto)', val: cas.c409, note: 'Suma total de bases brutas emitidas' },
      { code: '419', desc: 'TOTAL VENTAS Y OTRAS OPERACIONES (Neto)', val: cas.c419, note: 'Suma total de bases netas emitidas' },
      { code: '429', desc: 'TOTAL IMPUESTO GENERADO', val: cas.c429, note: '421 + 420 + 435' },
      { code: '499', desc: 'TOTAL IMPUESTO CAUSADO EN VENTAS', val: cas.c499, note: 'Total impuesto percibido' },

      // Compras
      { code: '500', desc: 'Adquisiciones gravadas tarifa diferente de cero con CT (Bruto)', val: cas.c500, note: 'Bases compras al 15% con derecho total' },
      { code: '510', desc: 'Adquisiciones gravadas tarifa diferente de cero con CT (Neto)', val: cas.c510, note: '500 menos Notas de Crédito recibidas' },
      { code: '520', desc: 'Impuesto generado en adquisiciones con derecho a CT', val: cas.c520, note: '510 * 15%' },
      { code: '505', desc: 'Adquisiciones gravadas tarifa 0% (Bruto)', val: cas.c505, note: 'Compras no gravadas' },
      { code: '515', desc: 'Adquisiciones gravadas tarifa 0% (Neto)', val: cas.c515, note: '505 menos NCs' },
      { code: '506', desc: 'Adquisiciones a contribuyentes RIMPE', val: cas.c506, note: 'Notas de venta o compras RIMPE' },
      { code: '509', desc: 'TOTAL ADQUISICIONES Y PAGOS (Bruto)', val: cas.c509, note: 'Total de adquisiciones del período' },
      { code: '519', desc: 'TOTAL ADQUISICIONES Y PAGOS (Neto)', val: cas.c519, note: 'Bases netas comprobadas' },
      { code: '553', desc: 'Factor de Proporcionalidad para Crédito Tributario (FP)', val: cas.c553 ? `${cas.c553.toFixed(2)}%` : '100.00%', note: 'Fórmula oficial Art. 66 LRTI' },
      { code: '564', desc: 'TOTAL CRÉDITO TRIBUTARIO APLICABLE ESTE MES', val: cas.c564, note: 'Crédito tributario de compras del período' },
      { code: '565', desc: 'IVA pagado en adquisiciones cargado al gasto deducible IR', val: cas.c565, note: 'Porción no compensable que deduce en Renta' },

      // Resumen Impositivo
      { code: '601', desc: 'Impuesto causado', val: cas.c601, note: 'MAX(499 - 564, 0)' },
      { code: '602', desc: 'Crédito tributario aplicable en este período', val: cas.c602, note: 'MIN(564, 499)' },
      { code: '605', desc: '(-) Saldo crédito tributario anterior (adquisiciones)', val: cas.c605, note: 'Arrastre automático de Casillero 615' },
      { code: '606', desc: '(-) Saldo crédito tributario anterior (retenciones)', val: cas.c606, note: 'Arrastre automático de Casillero 617' },
      { code: '609', desc: '(-) Retenciones en la fuente que le han sido efectuadas', val: cas.c609, note: 'XMLs de Retenciones Recibidas de clientes' },
      { code: '615', desc: 'Saldo crédito tributario para el próximo mes (adquisiciones)', val: cas.c615, note: 'Saldo a favor para el siguiente mes' },
      { code: '617', desc: 'Saldo crédito tributario para el próximo mes (retenciones)', val: cas.c617, note: 'Saldo de retenciones a favor próximo mes' },
      { code: '620', desc: 'SUBTOTAL A PAGAR', val: cas.c620, note: 'MAX(601 - 605 - 606 - 609, 0)' },
      { code: '699', desc: 'TOTAL IMPUESTO A PAGAR POR PERCEPCIÓN', val: cas.c699, note: 'Subtotal liquidado' },

      // Totales
      { code: '859', desc: 'TOTAL CONSOLIDADO DE IMPUESTO AL VALOR AGREGADO', val: cas.c859, note: '699 + retenciones emitidas (801)' },
      { code: '902', desc: 'TOTAL IMPUESTO A PAGAR', val: cas.c902, note: 'Monto definitivo a cancelar al SRI' }
    ];

    this.tbodyCasilleros.innerHTML = casillerosSpecs.map(item => {
      const displayVal = typeof item.val === 'number' ? `$${item.val.toFixed(2)}` : (item.val || '$0.00');
      const isImportant = ['499', '564', '601', '615', '617', '902'].includes(item.code);
      const rowClass = isImportant ? 'casillero-row-highlight' : '';
      return `
        <tr class="${rowClass}">
          <td class="col-casillero-code">${item.code}</td>
          <td class="col-casillero-desc">${item.desc}</td>
          <td class="col-casillero-val">${displayVal}</td>
          <td class="col-casillero-note">${item.note}</td>
        </tr>
      `;
    }).join('');
  }

  _renderZeroState() {
    this.badgeCompras.textContent = 'Sin datos';
    this.badgeCompras.className = 'source-status-badge status-neutral';
    this.valComprasCount.textContent = '0 facturas';
    this.valComprasTotal.textContent = '$0.00';

    this.badgeVentas.textContent = 'Sin datos';
    this.badgeVentas.className = 'source-status-badge status-neutral';
    this.valVentasCount.textContent = '0 facturas';
    this.valVentasTotal.textContent = '$0.00';

    this.badgeRetRecibidas.textContent = 'Sin datos';
    this.badgeRetRecibidas.className = 'source-status-badge status-neutral';
    this.valRetRecibidasCount.textContent = '0 retenciones';
    this.valRetRecibidasTotal.textContent = '$0.00';

    this.sumVentasNetas.textContent = '$0.00';
    this.sumIvaGenerado.textContent = 'IVA Generado: $0.00';
    this.sumComprasNetas.textContent = '$0.00';
    this.sumIvaAcreditable.textContent = 'Crédito del mes: $0.00';
    this.sumRetencionesFavor.textContent = '$0.00';
    this.sumCreditoAnterior.textContent = 'Crédito anterior: $0.00';

    this.cardResultadoFinal.className = 'iva-summary-card result-card result-zero';
    this.lblResultadoFinal.textContent = 'Resultado de Liquidación';
    this.sumResultadoMonto.textContent = '$0.00';
    this.sumResultadoDesc.textContent = 'Selecciona un cliente y período con comprobantes';

    if (this.tbodyCasilleros) {
      this.tbodyCasilleros.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">Sin datos calculados para este período.</td></tr>';
    }
  }

  _toggleAccordion() {
    if (!this.casillerosBody) return;
    const isVisible = this.casillerosBody.style.display !== 'none';
    if (isVisible) {
      this.casillerosBody.style.display = 'none';
      if (this.accordionCaret) this.accordionCaret.innerHTML = '&#9656;';
    } else {
      this.casillerosBody.style.display = 'block';
      if (this.accordionCaret) this.accordionCaret.innerHTML = '&#9662;';
    }
  }

  _navigateToSriUrl(url) {
    if (window.tribuNavDelegate && typeof window.tribuNavDelegate.goToSriUrl === 'function') {
      window.tribuNavDelegate.goToSriUrl(url);
    }
  }

  _openAjustesModal() {
    if (!this.modalAjustes) return;
    if (this.inputC605) this.inputC605.value = this.ajustesManuales.c605 || '';
    if (this.inputC606) this.inputC606.value = this.ajustesManuales.c606 || '';
    if (this.inputC607) this.inputC607.value = this.ajustesManuales.c607 || '';
    if (this.inputC802) this.inputC802.value = this.ajustesManuales.c802 || '';
    this.modalAjustes.classList.add('active');
  }

  _closeAjustesModal() {
    if (this.modalAjustes) this.modalAjustes.classList.remove('active');
  }

  _saveAjustesModal() {
    this.ajustesManuales.c605 = parseFloat(this.inputC605.value) || 0.0;
    this.ajustesManuales.c606 = parseFloat(this.inputC606.value) || 0.0;
    this.ajustesManuales.c607 = parseFloat(this.inputC607.value) || 0.0;
    this.ajustesManuales.c802 = parseFloat(this.inputC802.value) || 0.0;
    this._closeAjustesModal();
    this.loadPeriodData();
  }

  getCurrentCalculationPayload() {
    if (!this.currentData) return null;
    return {
      perfilamiento: this.currentData.perfilamiento,
      casilleros: this.currentData.casilleros,
      periodo: {
        year: this.filterYear ? this.filterYear.value : '',
        month: this.filterMonth ? this.filterMonth.value : ''
      }
    };
  }
}

// Exportar global para el renderer
window.IvaModuleView = IvaModuleView;
