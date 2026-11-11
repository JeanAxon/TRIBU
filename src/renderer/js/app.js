/**
 * TRIBU - Asistente Contable SRI Ecuador
 * Lógica del Frontend, Mini-Navegador y Visor XML / Generador ATS
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 0. CONTROLADOR DE SPLASH SCREEN ANIMADO AL INICIAR
  const splashOverlay = document.getElementById('appSplashOverlay');
  if (splashOverlay) {
    let splashDismissed = false;
    const dismissSplash = () => {
      if (splashDismissed) return;
      splashDismissed = true;
      splashOverlay.classList.add('fade-out');
      setTimeout(() => {
        splashOverlay.style.display = 'none';
      }, 420);
    };

    // Salida automática fluida tras la animación (1.8s)
    setTimeout(dismissSplash, 1850);

    // Salto inmediato opcional por clic o teclado
    splashOverlay.addEventListener('click', dismissSplash);
    window.addEventListener('keydown', (e) => {
      if (!splashDismissed && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) {
        dismissSplash();
      }
    }, { once: true });
  }

  // 0.1 CONTROLADOR DE ACTUALIZACIONES AUTOMÁTICAS Y VERSIÓN EN ENCABEZADO
  const appVersionText = document.getElementById('appVersionText');
  const popoverCurrentVersion = document.getElementById('popoverCurrentVersion');
  const btnNotificationBell = document.getElementById('btnNotificationBell');
  const notificationPopover = document.getElementById('notificationPopover');
  const notificationBadgeDot = document.getElementById('notificationBadgeDot');
  const updatePopoverTitle = document.getElementById('updatePopoverTitle');
  const updatePopoverDesc = document.getElementById('updatePopoverDesc');
  const updateIconCircle = document.getElementById('updateIconCircle');
  const updatePopoverProgressBox = document.getElementById('updatePopoverProgressBox');
  const updatePopoverProgressFill = document.getElementById('updatePopoverProgressFill');
  const updatePopoverProgressPct = document.getElementById('updatePopoverProgressPct');
  const btnPopoverCheck = document.getElementById('btnPopoverCheck');
  const btnPopoverRestart = document.getElementById('btnPopoverRestart');

  const appUpdateBanner = document.getElementById('appUpdateBanner');
  const updateBannerText = document.getElementById('updateBannerText');
  const btnUpdateRestart = document.getElementById('btnUpdateRestart');
  const btnUpdateClose = document.getElementById('btnUpdateClose');

  // Obtener y mostrar la versión dinámica de la app
  if (window.tribuApi && typeof window.tribuApi.getAppVersion === 'function') {
    window.tribuApi.getAppVersion().then((ver) => {
      if (ver) {
        if (appVersionText) appVersionText.textContent = `v${ver}`;
        if (popoverCurrentVersion) popoverCurrentVersion.textContent = `v${ver}`;
      }
    }).catch(() => {});
  }

  // Alternar popover de la campana de notificaciones
  if (btnNotificationBell && notificationPopover) {
    btnNotificationBell.addEventListener('click', (e) => {
      e.stopPropagation();
      notificationPopover.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!notificationPopover.contains(e.target) && !btnNotificationBell.contains(e.target)) {
        notificationPopover.classList.remove('show');
      }
    });
  }

  // Botón buscar actualizaciones en el popover
  if (btnPopoverCheck) {
    btnPopoverCheck.addEventListener('click', async () => {
      btnPopoverCheck.disabled = true;
      btnPopoverCheck.textContent = 'Buscando...';
      if (updatePopoverTitle) updatePopoverTitle.textContent = 'Buscando actualizaciones...';
      if (updatePopoverDesc) updatePopoverDesc.textContent = 'Consultando en el repositorio oficial de GitHub.';
      try {
        if (window.tribuApi && typeof window.tribuApi.checkForUpdates === 'function') {
          await window.tribuApi.checkForUpdates();
        }
      } catch (e) {
        console.warn('Error comprobando actualización:', e);
      }
      setTimeout(() => {
        btnPopoverCheck.disabled = false;
        btnPopoverCheck.textContent = 'Buscar actualizaciones';
      }, 3500);
    });
  }

  // Botón reiniciar y actualizar en el popover
  if (btnPopoverRestart) {
    btnPopoverRestart.addEventListener('click', () => {
      btnPopoverRestart.disabled = true;
      btnPopoverRestart.textContent = 'Actualizando...';
      if (window.tribuApi && typeof window.tribuApi.quitAndInstallUpdate === 'function') {
        window.tribuApi.quitAndInstallUpdate();
      }
    });
  }

  // Escuchar eventos en tiempo real del auto-updater
  if (window.tribuApi && typeof window.tribuApi.onUpdaterStatus === 'function') {
    window.tribuApi.onUpdaterStatus((data) => {
      if (data.status === 'checking') {
        if (updatePopoverTitle) updatePopoverTitle.textContent = 'Buscando actualizaciones...';
        if (updatePopoverDesc) updatePopoverDesc.textContent = 'Consultando en GitHub...';
      } else if (data.status === 'available') {
        // Alerta en la campana
        if (notificationBadgeDot) {
          notificationBadgeDot.style.display = 'block';
          notificationBadgeDot.classList.add('has-update');
        }
        if (updateIconCircle) updateIconCircle.classList.add('available');
        if (updatePopoverTitle) updatePopoverTitle.textContent = `¡Nueva versión v${data.version} disponible!`;
        if (updatePopoverDesc) updatePopoverDesc.textContent = 'Descargando en segundo plano. Se instalará automáticamente al cerrar.';
        if (updatePopoverProgressBox) updatePopoverProgressBox.style.display = 'block';

        // Banner discreto inferior
        if (appUpdateBanner) {
          appUpdateBanner.style.display = 'flex';
          if (updateBannerText) updateBannerText.textContent = `Descargando actualización v${data.version}...`;
          if (btnUpdateRestart) btnUpdateRestart.style.display = 'none';
        }
      } else if (data.status === 'downloading') {
        if (notificationBadgeDot) {
          notificationBadgeDot.style.display = 'block';
          notificationBadgeDot.classList.add('has-update');
        }
        if (updatePopoverProgressBox) updatePopoverProgressBox.style.display = 'block';
        if (updatePopoverProgressFill) updatePopoverProgressFill.style.width = `${data.percent}%`;
        if (updatePopoverProgressPct) updatePopoverProgressPct.textContent = `${data.percent}%`;

        if (appUpdateBanner) {
          appUpdateBanner.style.display = 'flex';
          if (updateBannerText) updateBannerText.textContent = `Descargando actualización: ${data.percent}%`;
          if (btnUpdateRestart) btnUpdateRestart.style.display = 'none';
        }
      } else if (data.status === 'downloaded') {
        if (notificationBadgeDot) {
          notificationBadgeDot.style.display = 'block';
          notificationBadgeDot.classList.add('has-update');
        }
        if (updatePopoverTitle) updatePopoverTitle.textContent = `¡Versión v${data.version} lista para instalar!`;
        if (updatePopoverDesc) updatePopoverDesc.textContent = 'Actualización descargada. Puedes reiniciar ahora o se instalará automáticamente al salir.';
        if (updatePopoverProgressBox) updatePopoverProgressBox.style.display = 'none';
        if (btnPopoverRestart) btnPopoverRestart.style.display = 'inline-block';
        if (btnPopoverCheck) btnPopoverCheck.style.display = 'none';

        if (appUpdateBanner) {
          appUpdateBanner.style.display = 'flex';
          if (updateBannerText) updateBannerText.textContent = `¡Actualización v${data.version} lista!`;
          if (btnUpdateRestart) btnUpdateRestart.style.display = 'inline-block';
        }
      } else if (data.status === 'not-available') {
        if (notificationBadgeDot) notificationBadgeDot.style.display = 'none';
        if (updatePopoverTitle) updatePopoverTitle.textContent = 'TRIBU está actualizado';
        if (updatePopoverDesc) updatePopoverDesc.textContent = 'Cuentas con la versión más reciente en tu equipo.';
        if (updatePopoverProgressBox) updatePopoverProgressBox.style.display = 'none';
        if (btnPopoverRestart) btnPopoverRestart.style.display = 'none';
        if (btnPopoverCheck) btnPopoverCheck.style.display = 'inline-block';
      } else if (data.status === 'error') {
        if (updatePopoverTitle) updatePopoverTitle.textContent = 'Verificación completada';
        if (updatePopoverDesc) updatePopoverDesc.textContent = data.message || 'Sin conexión o versión local de desarrollo.';
        if (updatePopoverProgressBox) updatePopoverProgressBox.style.display = 'none';
      }
    });

    if (btnUpdateRestart) {
      btnUpdateRestart.addEventListener('click', () => {
        btnUpdateRestart.disabled = true;
        btnUpdateRestart.textContent = 'Actualizando...';
        window.tribuApi.quitAndInstallUpdate();
      });
    }

    if (btnUpdateClose) {
      btnUpdateClose.addEventListener('click', () => {
        if (appUpdateBanner) appUpdateBanner.style.display = 'none';
      });
    }
  }

  // Estado de la aplicación
  let state = {
    baseFolder: '',
    clients: [],
    activeClient: null,
    pendingClientForSession: null,
    isBulkDownloading: false,
    cancelBulkDownload: false,
    isProcessingReclamo: false,
    cancelReclamo: false,
    activeSection: 'clientes' // 'clientes' | 'sri' | 'ats'
  };

  // Referencias a vistas principales
  const views = {
    clientes: document.getElementById('viewClientes'),
    sri: document.getElementById('viewSri'),
    ats: document.getElementById('viewAts')
  };

  // Secciones de Navegación del Encabezado
  const navSectionClientes = document.getElementById('navSectionClientes');
  const navSectionSri = document.getElementById('navSectionSri');
  const navSectionAts = document.getElementById('navSectionAts');

  // Datos del Cliente en el Encabezado y Selector Desplegable Rápido
  const headerUserWrapper = document.getElementById('headerUserWrapper');
  const headerUserBadge = document.getElementById('headerUserBadge');
  const topbarClientName = document.getElementById('topbarClientName');
  const topbarClientRuc = document.getElementById('topbarClientRuc');
  const userStatusDot = document.getElementById('userStatusDot');
  const userDropdownMenu = document.getElementById('userDropdownMenu');
  const dropdownUserCount = document.getElementById('dropdownUserCount');
  const userDropdownList = document.getElementById('userDropdownList');
  const btnDropdownAddUser = document.getElementById('btnDropdownAddUser');

  // Acciones Contextuales del SRI en el Encabezado
  const btnTriggerBulkDownload = document.getElementById('btnTriggerBulkDownload');
  const btnDiscapacidadIva = document.getElementById('btnDiscapacidadIva');

  // Elementos de la Página de Clientes
  const clientsGrid = document.getElementById('clientsGrid');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const totalClientsCount = document.getElementById('totalClientsCount');
  const btnAddNewClient = document.getElementById('btnAddNewClient');
  const btnEmptyAddClient = document.getElementById('btnEmptyAddClient');

  // Ajustes de Carpeta de Clientes
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const settingsModal = document.getElementById('settingsModal');
  const btnCloseSettingsModal = document.getElementById('btnCloseSettingsModal');
  const btnDoneSettingsModal = document.getElementById('btnDoneSettingsModal');
  const settingsBaseFolderPath = document.getElementById('settingsBaseFolderPath');
  const btnChangeBaseFolderModal = document.getElementById('btnChangeBaseFolderModal');

  // Modales
  const clientModal = document.getElementById('clientModal');
  const askPasswordModal = document.getElementById('askPasswordModal');
  const bulkDownloadModal = document.getElementById('bulkDownloadModal');
  const atsSuccessModal = document.getElementById('atsSuccessModal');

  // Formulario de Cliente
  const clientForm = document.getElementById('clientForm');
  const clientId = document.getElementById('clientId');
  const inputRuc = document.getElementById('inputRuc');
  const typeNatural = document.getElementById('typeNatural');
  const typeJuridica = document.getElementById('typeJuridica');
  const fieldsNatural = document.getElementById('fieldsNatural');
  const fieldsJuridica = document.getElementById('fieldsJuridica');
  const inputApellidos = document.getElementById('inputApellidos');
  const inputNombres = document.getElementById('inputNombres');
  const inputRazonSocial = document.getElementById('inputRazonSocial');
  const previewFolderName = document.getElementById('previewFolderName');
  const previewFolderPath = document.getElementById('previewFolderPath');
  const inputPassword = document.getElementById('inputPassword');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const btnSaveClient = document.getElementById('btnSaveClient');
  const btnCancelClientModal = document.getElementById('btnCancelClientModal');
  const btnCloseClientModal = document.getElementById('btnCloseClientModal');

  // Modal de Detección de Duplicados o Nombres Parecidos
  const duplicateClientModal = document.getElementById('duplicateClientModal');
  const dupMatchReason = document.getElementById('dupMatchReason');
  const dupExistingName = document.getElementById('dupExistingName');
  const dupExistingRuc = document.getElementById('dupExistingRuc');
  const dupExistingFolder = document.getElementById('dupExistingFolder');
  const dupEnteredName = document.getElementById('dupEnteredName');
  const dupEnteredRuc = document.getElementById('dupEnteredRuc');
  const btnCloseDupModal = document.getElementById('btnCloseDupModal');
  const btnDupCancel = document.getElementById('btnDupCancel');
  const btnDupIsSameClient = document.getElementById('btnDupIsSameClient');
  const btnDupIsNewClient = document.getElementById('btnDupIsNewClient');

  let pendingDuplicateData = null;
  let pendingDuplicateMatch = null;

  // Modal Pedir Clave
  const inputAskPassword = document.getElementById('inputAskPassword');
  const btnToggleAskPassword = document.getElementById('btnToggleAskPassword');
  const checkRememberPassword = document.getElementById('checkRememberPassword');
  const btnSkipPassword = document.getElementById('btnSkipPassword');
  const btnSubmitPassword = document.getElementById('btnSubmitPassword');
  const btnCloseAskPasswordModal = document.getElementById('btnCloseAskPasswordModal');
  const askPassClientName = document.getElementById('askPassClientName');

  // Contenedores de SRI y ATS
  const webviewContainer = document.getElementById('webviewContainer');
  const clientAtsContainer = document.getElementById('clientAtsContainer');

  // Modal Ajuste IVA por Discapacidad
  const discapacidadModal = document.getElementById('discapacidadModal');
  const discapacidadDetectedRows = document.getElementById('discapacidadDetectedRows');
  const discapacidadDetectedTotalIva = document.getElementById('discapacidadDetectedTotalIva');
  const selectDiscapacidadRango = document.getElementById('selectDiscapacidadRango');
  const groupCustomPorcentaje = document.getElementById('groupCustomPorcentaje');
  const inputCustomPorcentaje = document.getElementById('inputCustomPorcentaje');
  const selectDefaultTipoGasto = document.getElementById('selectDefaultTipoGasto');
  const checkMarcarTodas = document.getElementById('checkMarcarTodas');
  const btnExecuteDiscapacidadIva = document.getElementById('btnExecuteDiscapacidadIva');
  const btnCancelDiscapacidadModal = document.getElementById('btnCancelDiscapacidadModal');
  const btnCloseDiscapacidadModal = document.getElementById('btnCloseDiscapacidadModal');

  // Banners y Estado
  const automationBanner = document.getElementById('automationBanner');
  const automationBannerText = document.getElementById('automationBannerText');
  const btnCloseBanner = document.getElementById('btnCloseBanner');
  const btnCorregirClaveBanner = document.getElementById('btnCorregirClaveBanner');

  // Modal Bulk Download
  const bulkDetectedCategory = document.getElementById('bulkDetectedCategory');
  const bulkDetectedRows = document.getElementById('bulkDetectedRows');
  const bulkDetectedPages = document.getElementById('bulkDetectedPages');
  const btnConfirmBulkDownload = document.getElementById('btnConfirmBulkDownload');
  const btnCancelBulkModal = document.getElementById('btnCancelBulkModal');
  const btnCloseBulkModal = document.getElementById('btnCloseBulkModal');

  // Floating Progress Drawer
  const downloadProgressDrawer = document.getElementById('downloadProgressDrawer');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressPercentBadge = document.getElementById('progressPercentBadge');
  const progressCompletedCount = document.getElementById('progressCompletedCount');
  const progressTotalInBatch = document.getElementById('progressTotalInBatch');
  const progressCurrentPage = document.getElementById('progressCurrentPage');
  const progressTotalPages = document.getElementById('progressTotalPages');
  const progressCurrentFile = document.getElementById('progressCurrentFile');
  const progressDrawerTitle = document.getElementById('progressDrawerTitle');
  const progressSpinner = document.getElementById('progressSpinner');
  const progressMetric1Label = document.getElementById('progressMetric1Label');
  const progressMetric2Label = document.getElementById('progressMetric2Label');
  const progressCurrentBoxLabel = document.getElementById('progressCurrentBoxLabel');
  const btnCloseProgressDrawer = document.getElementById('btnCloseProgressDrawer');
  const btnCancelDownloadProcess = document.getElementById('btnCancelDownloadProcess');
  const btnGoToAtsAfterDownload = document.getElementById('btnGoToAtsAfterDownload');

  let currentWebview = null;
  let drawerDismissTimer = null;

  function openProgressDrawer(title, initialStatus) {
    if (drawerDismissTimer) {
      clearTimeout(drawerDismissTimer);
      drawerDismissTimer = null;
    }
    downloadProgressDrawer.classList.remove('fade-out');
    downloadProgressDrawer.classList.add('active');
    if (title && progressDrawerTitle) progressDrawerTitle.textContent = title;
    if (initialStatus && progressCurrentFile) progressCurrentFile.textContent = initialStatus;
  }

  function dismissProgressDrawer(delayMs = 500) {
    if (drawerDismissTimer) {
      clearTimeout(drawerDismissTimer);
      drawerDismissTimer = null;
    }
    drawerDismissTimer = setTimeout(() => {
      downloadProgressDrawer.classList.add('fade-out');
      setTimeout(() => {
        downloadProgressDrawer.classList.remove('active', 'fade-out');
      }, 250);
    }, delayMs);
  }

  function closeProgressDrawerImmediate() {
    if (drawerDismissTimer) {
      clearTimeout(drawerDismissTimer);
      drawerDismissTimer = null;
    }
    downloadProgressDrawer.classList.add('fade-out');
    setTimeout(() => {
      downloadProgressDrawer.classList.remove('active', 'fade-out');
    }, 200);
  }

  // -------------------------------------------------------------
  // 1. NAVEGACIÓN PRINCIPAL ENTRE SECCIONES (Clientes, SRI, ATS)
  // -------------------------------------------------------------
  function switchMainSection(sectionName) {
    if (sectionName === 'sri' || sectionName === 'ats') {
      if (!state.activeClient) {
        showBanner('Por favor selecciona un cliente de la lista para ingresar al ' + (sectionName === 'sri' ? 'SRI' : 'ATS') + '.', 'warning', 4000);
        switchMainSection('clientes');
        return;
      }
    }

    state.activeSection = sectionName;

    // Actualizar botones de navegación en el encabezado
    navSectionClientes.classList.toggle('active', sectionName === 'clientes');
    navSectionSri.classList.toggle('active', sectionName === 'sri');
    navSectionAts.classList.toggle('active', sectionName === 'ats');

    // Alternar vistas
    views.clientes.classList.toggle('active', sectionName === 'clientes');
    views.sri.classList.toggle('active', sectionName === 'sri');
    views.ats.classList.toggle('active', sectionName === 'ats');

    // Si se cambia a ATS, refrescar la vista ATS para el cliente activo
    if (sectionName === 'ats' && state.activeClient) {
      atsModuleView.activate(state.activeClient);
    }

    // Control dinámico de la barra y botones de acción según la sección activa
    if (sectionName === 'sri') {
      startSriPageMonitor();
      updateSriActionButtonsVisibility();
    } else {
      stopSriPageMonitor();
      if (btnTriggerBulkDownload) {
        btnTriggerBulkDownload.style.display = 'none';
      }
      if (btnDiscapacidadIva) {
        btnDiscapacidadIva.style.display = 'none';
      }
    }
  }

  navSectionClientes.addEventListener('click', () => switchMainSection('clientes'));
  navSectionSri.addEventListener('click', () => switchMainSection('sri'));
  navSectionAts.addEventListener('click', () => switchMainSection('ats'));

  // -------------------------------------------------------------
  // CONTROLADOR DE MODO OSCURO (SLICER DETRÁS DEL LOGO TRIBU)
  // -------------------------------------------------------------
  const themeToggleCheckbox = document.getElementById('themeToggleCheckbox');

  function initTheme() {
    try {
      const savedTheme = localStorage.getItem('tribu_theme');
      const isDark = savedTheme === 'dark';
      document.body.classList.toggle('theme-dark', isDark);
      if (themeToggleCheckbox) {
        themeToggleCheckbox.checked = isDark;
      }
    } catch (err) {
      console.warn('Error leyendo tema desde localStorage:', err);
    }
  }

  if (themeToggleCheckbox) {
    themeToggleCheckbox.addEventListener('change', (e) => {
      const isDark = e.target.checked;
      document.body.classList.toggle('theme-dark', isDark);
      try {
        localStorage.setItem('tribu_theme', isDark ? 'dark' : 'light');
      } catch (err) {
        console.warn('Error guardando preferencia de tema:', err);
      }
    });
  }

  // Inicializar preferencia de tema de inmediato
  initTheme();

  function updateHeaderClientDisplay(client) {
    if (client) {
      topbarClientName.textContent = client.razonSocial;
      topbarClientRuc.textContent = client.ruc;
      userStatusDot.classList.add('active');
    } else {
      topbarClientName.textContent = 'Sin cliente seleccionado';
      topbarClientRuc.textContent = 'Selecciona un cliente para comenzar';
      userStatusDot.classList.remove('active');
    }
    renderUserDropdown();
  }

  // -------------------------------------------------------------
  // DESPLEGABLE RÁPIDO DE USUARIOS EN EL ENCABEZADO
  // -------------------------------------------------------------
  function renderUserDropdown() {
    if (!userDropdownList) return;
    userDropdownList.innerHTML = '';

    const count = state.clients ? state.clients.length : 0;
    if (dropdownUserCount) {
      dropdownUserCount.textContent = `${count} ${count === 1 ? 'usuario' : 'usuarios'}`;
    }

    if (!state.clients || state.clients.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'dropdown-empty-item';
      emptyDiv.textContent = 'No hay usuarios registrados';
      userDropdownList.appendChild(emptyDiv);
      return;
    }

    state.clients.forEach(client => {
      const isActive = state.activeClient && (state.activeClient.id === client.id || state.activeClient.ruc === client.ruc);
      const item = document.createElement('div');
      item.className = `user-dropdown-item ${isActive ? 'active' : ''}`;
      item.title = `${client.razonSocial} (${client.ruc})`;

      const dotClass = client.hasPassword ? 'saved' : 'pending';
      item.innerHTML = `
        <span class="dropdown-item-dot ${dotClass}" title="${client.hasPassword ? 'Contraseña guardada' : 'Sin contraseña'}"></span>
        <div class="dropdown-item-info">
          <span class="dropdown-item-name">${escapeHtml(client.razonSocial)}</span>
          <span class="dropdown-item-ruc">${escapeHtml(client.ruc)}</span>
        </div>
        ${isActive ? '<span class="dropdown-item-active-pill">Activo</span>' : ''}
      `;

      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeUserDropdown();
        await switchActiveClient(client);
      });

      userDropdownList.appendChild(item);
    });
  }

  function toggleUserDropdown() {
    if (!userDropdownMenu) return;
    const isOpening = !userDropdownMenu.classList.contains('active');
    if (isOpening) {
      renderUserDropdown();
      userDropdownMenu.classList.add('active');
      if (headerUserBadge) headerUserBadge.classList.add('active');
    } else {
      closeUserDropdown();
    }
  }

  function closeUserDropdown() {
    if (userDropdownMenu) userDropdownMenu.classList.remove('active');
    if (headerUserBadge) headerUserBadge.classList.remove('active');
  }

  if (headerUserBadge) {
    headerUserBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleUserDropdown();
    });
  }

  if (btnDropdownAddUser) {
    btnDropdownAddUser.addEventListener('click', (e) => {
      e.stopPropagation();
      closeUserDropdown();
      openCreateClientModal();
    });
  }

  // Cerrar menú al hacer clic fuera del badge o presionar Escape
  document.addEventListener('click', (e) => {
    if (userDropdownMenu && userDropdownMenu.classList.contains('active')) {
      if (headerUserWrapper && !headerUserWrapper.contains(e.target)) {
        closeUserDropdown();
      }
    }
  });

  // Manejador global accesible para tecla Escape (Cierre de modales, popovers y menús)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // 1. Modales activos (cierra el modal superior)
      const activeModals = document.querySelectorAll('.modal-overlay.active');
      if (activeModals.length > 0) {
        const topModal = activeModals[activeModals.length - 1];
        topModal.classList.remove('active');
        return;
      }
      // 2. Popover de notificaciones
      if (notificationPopover && notificationPopover.classList.contains('active')) {
        notificationPopover.classList.remove('active');
        return;
      }
      // 3. Menú desplegable de usuarios
      if (userDropdownMenu && userDropdownMenu.classList.contains('active')) {
        closeUserDropdown();
        return;
      }
    }
  });

  // Cierre accesible de modales al hacer clic en el backdrop exterior
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  async function switchActiveClient(client) {
    state.activeClient = client;
    updateHeaderClientDisplay(client);

    // Dependiendo de la sección en la que esté el usuario:
    if (state.activeSection === 'sri') {
      // En la sección SRI: cambiar la sesión y cargar el webview del nuevo usuario
      await startClientSession(client);
    } else if (state.activeSection === 'ats') {
      // En la sección ATS: activar comprobantes y periodos del nuevo usuario sin cambiar de sección
      atsModuleView.activate(client);
      showBanner(`Cambiado a ${client.razonSocial} en ATS`, 'info', 1200);
    } else {
      // En la sección Clientes: solo actualiza la visualización de la interfaz
      renderClients(searchInput ? searchInput.value : '');
      showBanner(`Usuario activo: ${client.razonSocial}`, 'info', 1200);
    }
  }

  // -------------------------------------------------------------
  // 2. AJUSTES DEL SISTEMA (CONFIGURACIÓN DE CARPETA BASE)
  // -------------------------------------------------------------
  async function loadBaseFolder() {
    try {
      state.baseFolder = await window.tribuApi.getBaseFolder();
      if (settingsBaseFolderPath) {
        settingsBaseFolderPath.textContent = state.baseFolder;
        settingsBaseFolderPath.title = state.baseFolder;
      }
    } catch (e) {
      console.error('Error cargando carpeta base:', e);
    }
  }

  btnOpenSettings.addEventListener('click', async () => {
    await loadBaseFolder();
    settingsModal.classList.add('active');
  });

  btnCloseSettingsModal.addEventListener('click', () => {
    settingsModal.classList.remove('active');
  });

  btnDoneSettingsModal.addEventListener('click', () => {
    settingsModal.classList.remove('active');
  });

  btnChangeBaseFolderModal.addEventListener('click', async () => {
    try {
      const selected = await window.tribuApi.selectFolder(state.baseFolder);
      if (selected) {
        await window.tribuApi.setBaseFolder(selected);
        await loadBaseFolder();
        await loadClients();
        showBanner('Carpeta de clientes actualizada a: ' + selected, 'success', 3000);
      }
    } catch (err) {
      alert('Error cambiando la carpeta: ' + err.message);
    }
  });

  // -------------------------------------------------------------
  // 3. GESTIÓN DE CLIENTES (CRUD LIMPIO Y PRECISO)
  // -------------------------------------------------------------
  async function loadClients() {
    try {
      state.clients = await window.tribuApi.getClients();
      renderClients(searchInput ? searchInput.value : '');
      renderUserDropdown();
    } catch (err) {
      console.error('Error cargando clientes:', err);
    }
  }

  function getClientInitials(name) {
    if (!name) return 'CL';
    const clean = name.trim();
    const parts = clean.split(/\s+/).filter(p => p.length > 0 && !['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'E'].includes(p.toUpperCase()));
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (clean.substring(0, 2) || 'CL').toUpperCase();
  }

  function renderClients(filterText = '') {
    const query = filterText.toLowerCase().trim();
    const filtered = state.clients.filter(c => 
      c.ruc.includes(query) || c.razonSocial.toLowerCase().includes(query)
    );

    totalClientsCount.textContent = state.clients.length;

    if (state.clients.length === 0) {
      emptyState.style.display = 'block';
      clientsGrid.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    clientsGrid.style.display = 'grid';
    clientsGrid.innerHTML = '';

    if (filtered.length === 0) {
      clientsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--muted-foreground); padding: 40px 20px; font-size: 13.5px;">No se encontraron clientes para "<strong>${escapeHtml(filterText)}</strong>".</div>`;
      return;
    }

    filtered.forEach(client => {
      const isClientActive = state.activeClient && (state.activeClient.id === client.id || state.activeClient.ruc === client.ruc);
      const initials = getClientInitials(client.razonSocial);
      const card = document.createElement('div');
      card.className = `client-card ${isClientActive ? 'client-card-active' : ''}`;

      card.innerHTML = `
        <div class="card-top-row">
          <div class="card-identity-group">
            <div class="client-avatar-badge" aria-hidden="true">${escapeHtml(initials)}</div>
            <div class="card-company-name" title="${escapeHtml(client.razonSocial)}">${escapeHtml(client.razonSocial)}</div>
          </div>
          <div class="card-management-actions">
            <button class="btn-icon-tiny btn-edit-client" title="Editar cliente y contraseña" aria-label="Editar ${escapeHtml(client.razonSocial)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Editar</span>
            </button>
            <button class="btn-icon-tiny delete btn-delete-client" title="Eliminar cliente" aria-label="Eliminar ${escapeHtml(client.razonSocial)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Eliminar</span>
            </button>
          </div>
        </div>

        <div class="card-middle-row">
          <div class="card-ruc-wrapper">
            <span class="card-ruc-label">RUC</span>
            <span class="card-ruc-badge">${escapeHtml(client.ruc)}</span>
          </div>
          <span class="card-status-badge ${client.hasPassword ? 'status-saved' : 'status-pending'}">
            <span class="status-dot" aria-hidden="true"></span>
            <span>${client.hasPassword ? 'Clave guardada' : 'Sin clave'}</span>
          </span>
        </div>

        <button class="btn-open-session">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            ${isClientActive 
              ? '<polyline points="20 6 9 17 4 12"></polyline>' 
              : '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line>'
            }
          </svg>
          <span>${isClientActive ? 'Sesión SRI Activa' : 'Iniciar Sesión SRI'}</span>
        </button>
      `;

      card.querySelector('.btn-open-session').addEventListener('click', () => startClientSession(client));
      card.querySelector('.btn-edit-client').addEventListener('click', () => openEditClientModal(client));
      card.querySelector('.btn-delete-client').addEventListener('click', () => confirmDeleteClient(client));

      clientsGrid.appendChild(card);
    });
  }

  searchInput.addEventListener('input', (e) => {
    renderClients(e.target.value);
  });

  // -------------------------------------------------------------
  // 4. MODAL NUEVO / EDITAR CLIENTE (SOLO DESDE CLIENTES)
  // -------------------------------------------------------------
  function updateFolderPreview() {
    let name = '';
    const isNatural = typeNatural ? typeNatural.checked : true;

    if (isNatural) {
      const ape = inputApellidos ? inputApellidos.value.trim().toUpperCase() : '';
      const nom = inputNombres ? inputNombres.value.trim().toUpperCase() : '';
      if (ape || nom) {
        name = `${ape} ${nom}`.trim();
      }
    } else {
      name = inputRazonSocial ? inputRazonSocial.value.trim().toUpperCase() : '';
    }

    const sanitized = name.replace(/[<>:"/\\|?*]/g, '').trim();
    const base = state.baseFolder || 'C:\\...\\SRI_Clientes';

    if (sanitized) {
      previewFolderName.textContent = sanitized;
      previewFolderPath.textContent = `Carpeta: ${base}\\${sanitized}`;
    } else {
      previewFolderName.textContent = isNatural
        ? 'APELLIDOS NOMBRES'
        : 'RAZÓN SOCIAL';
      previewFolderPath.textContent = `Ruta: ${base}\\...`;
    }
  }

  if (typeNatural) {
    typeNatural.addEventListener('change', () => {
      if (fieldsNatural) fieldsNatural.style.display = 'flex';
      if (fieldsJuridica) fieldsJuridica.style.display = 'none';
      updateFolderPreview();
      if (inputApellidos) inputApellidos.focus();
    });
  }

  if (typeJuridica) {
    typeJuridica.addEventListener('change', () => {
      if (fieldsNatural) fieldsNatural.style.display = 'none';
      if (fieldsJuridica) fieldsJuridica.style.display = 'flex';
      updateFolderPreview();
      if (inputRazonSocial) inputRazonSocial.focus();
    });
  }

  if (inputApellidos) inputApellidos.addEventListener('input', updateFolderPreview);
  if (inputNombres) inputNombres.addEventListener('input', updateFolderPreview);
  if (inputRazonSocial) inputRazonSocial.addEventListener('input', updateFolderPreview);

  function openCreateClientModal() {
    document.getElementById('modalTitle').textContent = 'Nuevo Cliente';
    clientId.value = '';
    clientForm.reset();
    if (typeNatural) typeNatural.checked = true;
    if (fieldsNatural) fieldsNatural.style.display = 'flex';
    if (fieldsJuridica) fieldsJuridica.style.display = 'none';
    inputPassword.type = 'password';
    btnTogglePassword.textContent = 'Ver';
    inputPassword.placeholder = 'Ingresa la contraseña SRI';
    updateFolderPreview();
    clientModal.classList.add('active');
    inputRuc.focus();
  }

  async function openEditClientModal(client) {
    document.getElementById('modalTitle').textContent = 'Editar Cliente';
    clientId.value = client.id || client.ruc;
    inputRuc.value = client.ruc;

    const isJuridica = client.tipoContribuyente === 'juridica';
    if (isJuridica) {
      if (typeJuridica) typeJuridica.checked = true;
      if (fieldsNatural) fieldsNatural.style.display = 'none';
      if (fieldsJuridica) fieldsJuridica.style.display = 'flex';
      if (inputRazonSocial) inputRazonSocial.value = client.razonSocial || '';
      if (inputApellidos) inputApellidos.value = '';
      if (inputNombres) inputNombres.value = '';
    } else {
      if (typeNatural) typeNatural.checked = true;
      if (fieldsNatural) fieldsNatural.style.display = 'flex';
      if (fieldsJuridica) fieldsJuridica.style.display = 'none';
      if (client.apellidos && client.nombres) {
        if (inputApellidos) inputApellidos.value = client.apellidos;
        if (inputNombres) inputNombres.value = client.nombres;
      } else {
        const parts = (client.razonSocial || '').trim().split(/\s+/);
        if (parts.length >= 3) {
          if (inputApellidos) inputApellidos.value = parts.slice(0, 2).join(' ');
          if (inputNombres) inputNombres.value = parts.slice(2).join(' ');
        } else if (parts.length === 2) {
          if (inputApellidos) inputApellidos.value = parts[0];
          if (inputNombres) inputNombres.value = parts[1];
        } else {
          if (inputApellidos) inputApellidos.value = client.razonSocial || '';
          if (inputNombres) inputNombres.value = '';
        }
      }
      if (inputRazonSocial) inputRazonSocial.value = '';
    }

    inputPassword.type = 'password';
    btnTogglePassword.textContent = 'Ver';

    try {
      const creds = await window.tribuApi.getCredentials(client.id || client.ruc);
      if (creds && creds.password) {
        inputPassword.value = creds.password;
        inputPassword.placeholder = 'Contraseña guardada';
      } else {
        inputPassword.value = '';
        inputPassword.placeholder = 'Sin contraseña guardada';
      }
    } catch (e) {
      inputPassword.value = '';
    }

    updateFolderPreview();
    clientModal.classList.add('active');
  }

  function closeClientModal() {
    clientModal.classList.remove('active');
    clientForm.reset();
  }

  btnTogglePassword.addEventListener('click', () => {
    if (inputPassword.type === 'password') {
      inputPassword.type = 'text';
      btnTogglePassword.textContent = 'Ocultar';
    } else {
      inputPassword.type = 'password';
      btnTogglePassword.textContent = 'Ver';
    }
  });

  btnToggleAskPassword.addEventListener('click', () => {
    if (inputAskPassword.type === 'password') {
      inputAskPassword.type = 'text';
      btnToggleAskPassword.textContent = 'Ocultar';
    } else {
      inputAskPassword.type = 'password';
      btnToggleAskPassword.textContent = 'Ver';
    }
  });

  btnSaveClient.addEventListener('click', async (e) => {
    e.preventDefault();
    const rucVal = inputRuc.value.trim();

    if (!rucVal || rucVal.length !== 13 || !/^\d+$/.test(rucVal)) {
      alert('Por favor ingresa un RUC válido de 13 dígitos numéricos.');
      inputRuc.focus();
      return;
    }

    let clientData = {
      id: clientId.value || rucVal,
      ruc: rucVal
    };

    const isNatural = typeNatural ? typeNatural.checked : true;
    if (isNatural) {
      const apeVal = inputApellidos ? inputApellidos.value.trim().toUpperCase() : '';
      const nomVal = inputNombres ? inputNombres.value.trim().toUpperCase() : '';

      if (!apeVal) {
        alert('Por favor ingresa los Apellidos del cliente (ej: ESPINOZA AZANZA).\n\nPara estandarizar el nombre y la carpeta del usuario, es obligatorio registrar Apellidos y Nombres.');
        if (inputApellidos) inputApellidos.focus();
        return;
      }

      if (!nomVal) {
        alert('Por favor ingresa los Nombres del cliente (ej: DOLORES MARICELA).\n\nPara estandarizar el nombre y la carpeta del usuario, es obligatorio registrar Apellidos y Nombres.');
        if (inputNombres) inputNombres.focus();
        return;
      }

      clientData.tipoContribuyente = 'natural';
      clientData.apellidos = apeVal;
      clientData.nombres = nomVal;
      clientData.razonSocial = `${apeVal} ${nomVal}`;
    } else {
      const razonVal = inputRazonSocial ? inputRazonSocial.value.trim().toUpperCase() : '';
      if (!razonVal) {
        alert('Por favor ingresa la Razón Social de la empresa.');
        if (inputRazonSocial) inputRazonSocial.focus();
        return;
      }
      clientData.tipoContribuyente = 'juridica';
      clientData.razonSocial = razonVal;
    }

    if (inputPassword.value) {
      clientData.password = inputPassword.value;
    }

    // Protocolo de prevención de nombres duplicados o parecidos
    try {
      const match = await window.tribuApi.checkDuplicateClient(clientData, clientId.value || null);
      if (match) {
        openDuplicateResolutionModal(clientData, match);
        return;
      }
    } catch (checkErr) {
      console.warn('Aviso verificando duplicados:', checkErr);
    }

    await performSaveClient(clientData);
  });

  async function performSaveClient(clientData, options = {}) {
    try {
      const isNew = options.isNewClient !== undefined ? options.isNewClient : !clientId.value;
      await window.tribuApi.saveClient(clientData, options);
      closeClientModal();
      await loadClients();

      const savedClient = state.clients.find(c => c.ruc === clientData.ruc) || clientData;

      if (isNew) {
        // Al crear un nuevo usuario, se envía directo a la sección de SRI de forma automática
        showBanner(`Nuevo usuario "${savedClient.razonSocial}" creado. Redirigiendo a sección SRI...`, 'success', 2500);
        await startClientSession(savedClient);
      } else {
        // Para clientes editados existentes, actualizar encabezado sin cambiar de sección
        if (state.activeClient && (state.activeClient.id === clientData.id || state.activeClient.ruc === clientData.ruc || (options.overwriteExistingId && state.activeClient.id === options.overwriteExistingId))) {
          state.activeClient = savedClient;
          updateHeaderClientDisplay(state.activeClient);
        }
      }
      return true;
    } catch (err) {
      alert('Error guardando el cliente: ' + err.message);
      return false;
    }
  }

  function openDuplicateResolutionModal(clientData, match) {
    pendingDuplicateData = clientData;
    pendingDuplicateMatch = match;

    dupMatchReason.textContent = match.matchReason || 'Nombre similar';
    dupExistingName.textContent = match.existingName;
    dupExistingRuc.textContent = match.existingRuc;
    dupExistingFolder.textContent = `Carpeta actual: ${match.existingFolder || 'SRI_Clientes'}`;

    dupEnteredName.textContent = clientData.razonSocial;
    dupEnteredRuc.textContent = clientData.ruc;

    duplicateClientModal.classList.add('active');
  }

  function closeDuplicateResolutionModal() {
    duplicateClientModal.classList.remove('active');
    pendingDuplicateData = null;
    pendingDuplicateMatch = null;
  }

  if (btnDupCancel) btnDupCancel.addEventListener('click', closeDuplicateResolutionModal);
  if (btnCloseDupModal) btnCloseDupModal.addEventListener('click', closeDuplicateResolutionModal);

  // Caso 1: Es el mismo cliente -> Modificar / Corregir nombre del cliente existente
  if (btnDupIsSameClient) {
    btnDupIsSameClient.addEventListener('click', async () => {
      if (!pendingDuplicateData || !pendingDuplicateMatch) return;
      const clientData = { ...pendingDuplicateData };
      const existing = pendingDuplicateMatch.existingClient;
      closeDuplicateResolutionModal();

      const ok = await performSaveClient(clientData, { overwriteExistingId: existing.id || existing.ruc, isNewClient: false });
      if (ok) {
        showBanner(`Cliente actualizado correctamente. Se corrigió el nombre a "${clientData.razonSocial}" y se actualizó su carpeta.`, 'success', 6000);
      }
    });
  }

  // Caso 2: Es un nuevo cliente -> Colocar elemento diferenciador automáticamente
  if (btnDupIsNewClient) {
    btnDupIsNewClient.addEventListener('click', async () => {
      if (!pendingDuplicateData) return;
      const clientData = { ...pendingDuplicateData };
      closeDuplicateResolutionModal();

      // Generar elemento diferenciador automático con el RUC
      const differentiator = `(${clientData.ruc})`;
      clientData.diferenciador = differentiator;
      clientData.razonSocial = `${clientData.razonSocial} ${differentiator}`;

      const ok = await performSaveClient(clientData, { isNewClient: true });
      if (ok) {
        showBanner(`Nuevo cliente creado con diferenciador automático: "${clientData.razonSocial}".`, 'success', 6000);
      }
    });
  }

  if (clientForm) {
    clientForm.addEventListener('submit', (e) => {
      e.preventDefault();
      btnSaveClient.click();
    });
  }

  btnAddNewClient.addEventListener('click', openCreateClientModal);
  btnEmptyAddClient.addEventListener('click', openCreateClientModal);
  btnCloseClientModal.addEventListener('click', closeClientModal);
  btnCancelClientModal.addEventListener('click', closeClientModal);

  async function confirmDeleteClient(client) {
    if (confirm(`¿Eliminar al cliente "${client.razonSocial}" de la lista?`)) {
      await window.tribuApi.deleteClient(client.id || client.ruc);
      if (state.activeClient && (state.activeClient.id === client.id || state.activeClient.ruc === client.ruc)) {
        state.activeClient = null;
        updateHeaderClientDisplay(null);
        switchMainSection('clientes');
      }
      await loadClients();
    }
  }

  // -------------------------------------------------------------
  // 5. INICIO DE SESIÓN SRI
  // -------------------------------------------------------------
  async function startClientSession(client) {
    state.activeClient = client;

    if (!client.hasPassword) {
      state.pendingClientForSession = client;
      askPassClientName.textContent = `${client.razonSocial} (${client.ruc})`;
      inputAskPassword.value = '';
      inputAskPassword.type = 'password';
      btnToggleAskPassword.textContent = 'Ver';
      askPasswordModal.classList.add('active');
      return;
    }

    await launchBrowserForClient(client);
  }

  btnSubmitPassword.addEventListener('click', async () => {
    const enteredPass = inputAskPassword.value;
    const remember = checkRememberPassword.checked;
    const client = state.pendingClientForSession;

    if (!enteredPass) {
      alert('Por favor ingresa la contraseña.');
      return;
    }

    if (remember) {
      await window.tribuApi.saveClient({
        ...client,
        password: enteredPass
      });
      await loadClients();
      state.activeClient = state.clients.find(c => c.ruc === client.ruc) || client;
    }

    askPasswordModal.classList.remove('active');
    await launchBrowserForClient(client, enteredPass);
  });

  btnSkipPassword.addEventListener('click', async () => {
    const client = state.pendingClientForSession;
    askPasswordModal.classList.remove('active');
    await launchBrowserForClient(client, null);
  });

  btnCloseAskPasswordModal.addEventListener('click', () => {
    askPasswordModal.classList.remove('active');
  });

  async function launchBrowserForClient(client, temporaryPassword = null) {
    updateHeaderClientDisplay(client);
    showBanner('Conectando con el SRI para ' + client.razonSocial + '...', 'info');

    await window.tribuApi.configureDownloadTarget({
      client: client,
      customFolder: client.defaultFolder,
      organizeByType: false
    });

    let credentials = null;
    if (temporaryPassword) {
      credentials = { ruc: client.ruc, password: temporaryPassword };
    } else {
      credentials = await window.tribuApi.getCredentials(client.id || client.ruc);
    }

    // Cambiar a la sección del SRI
    switchMainSection('sri');

    setupClientWebview(client, credentials);
    window.tribuApi.updateLastLogin(client.id || client.ruc);
  }

  function setupClientWebview(client, credentials) {
    webviewContainer.innerHTML = '';

    const webview = document.createElement('webview');
    webview.id = 'sriWebview';
    webview.partition = `persist:sri_${client.ruc}`;
    webview.src = 'https://srienlinea.sri.gob.ec/sri-en-linea/contribuyente/perfil';
    webview.setAttribute('allowpopups', 'true');
    webviewContainer.appendChild(webview);
    currentWebview = webview;

    let hasAttemptedLogin = false;
    let capturedPasswordPending = null;

    const handlePageLoadOrNavigate = async () => {
      const currentUrl = webview.getURL() || '';

      // 1. SI ESTAMOS EN LA PÁGINA DE LOGIN DE KEYCLOAK
      if (currentUrl.includes('/auth/realms/')) {
        try {
          const captureScript = await window.tribuApi.getPasswordCaptureScript();
          await webview.executeJavaScript(captureScript);

          const isErrorPresent = await webview.executeJavaScript(`
            Boolean(document.querySelector('.alert-error, .kc-feedback-text, #input-error, .alert-danger, [class*="error-message"]'))
          `);

          if (isErrorPresent) {
            hasAttemptedLogin = true;
            showBanner('Contraseña incorrecta. Escribe la clave correcta en pantalla o haz clic en Corregir Clave.', 'warning');
            if (btnCorregirClaveBanner) {
              btnCorregirClaveBanner.style.display = 'inline-flex';
            }
            return;
          }

          // Si no hay error y tenemos clave guardada, intentar auto-login
          if (credentials && credentials.password && !hasAttemptedLogin) {
            const loginScript = await window.tribuApi.getLoginScript(credentials.ruc, credentials.password);
            const result = await webview.executeJavaScript(loginScript);

            if (result) {
              if (result.status === 'submitting' || result.status === 'fields_filled') {
                hasAttemptedLogin = true;
                showBanner('Enviando credenciales al SRI...', 'info');
              } else if (result.status === 'needs_captcha') {
                hasAttemptedLogin = true;
                showBanner('Validación o código detectado. Resuélvelo en pantalla y presiona Ingresar.', 'warning');
              } else if (result.status === 'login_error') {
                hasAttemptedLogin = true;
                showBanner('Aviso del SRI: ' + result.message, 'warning');
                if (btnCorregirClaveBanner) btnCorregirClaveBanner.style.display = 'inline-flex';
              } else if (result.status === 'logged_in') {
                hasAttemptedLogin = true;
                showBanner('Acceso Correcto', 'success', 1200);
              }
            }
          }
        } catch (e) {
          console.warn('Error en inyección de login/captura:', e);
        }
      } 
      // 2. SI SALIMOS DE KEYCLOAK Y ENTRAMOS CON ÉXITO AL PORTAL DEL SRI
      else if (currentUrl.includes('/sri-en-linea/') && !currentUrl.includes('/auth/')) {
        if (btnCorregirClaveBanner) {
          btnCorregirClaveBanner.style.display = 'none';
        }

        try {
          if (!capturedPasswordPending) {
            const captured = await webview.executeJavaScript('window.__tribuCapturedPassword || sessionStorage.getItem("__tribuCapturedPassword") || null');
            if (captured && captured.length < 100) {
              capturedPasswordPending = captured;
            }
          }
        } catch (e) {}

        if (capturedPasswordPending && state.activeClient) {
          try {
            const currentCreds = await window.tribuApi.getCredentials(state.activeClient.id || state.activeClient.ruc);
            if (!currentCreds || currentCreds.password !== capturedPasswordPending) {
              await window.tribuApi.saveClient({
                ...state.activeClient,
                password: capturedPasswordPending
              });
              credentials = { ruc: state.activeClient.ruc, password: capturedPasswordPending };
              state.activeClient.hasPassword = true;
              showBanner('Acceso Correcto', 'success', 1200);
              await loadClients();
            } else {
              showBanner('Acceso Correcto', 'success', 1200);
            }
            try {
              await webview.executeJavaScript('sessionStorage.removeItem("__tribuCapturedPassword"); window.__tribuCapturedPassword = null;');
            } catch (e) {}
          } catch (e) {
            console.warn('Error actualizando credencial:', e);
            showBanner('Acceso Correcto', 'success', 1200);
          }
          capturedPasswordPending = null;
        } else {
          showBanner('Acceso Correcto', 'success', 1200);
        }
      }
    };

    // Capturar en tiempo real cualquier clave ingresada o pegada en la pantalla del webview
    webview.addEventListener('console-message', async (e) => {
      if (e.message && e.message.startsWith('__TRIBU_KEY__:')) {
        const pass = e.message.substring('__TRIBU_KEY__:'.length);
        if (pass && pass.length > 0 && pass.length < 100) {
          capturedPasswordPending = pass;
        }
      }
    });

    webview.addEventListener('dom-ready', async () => {
      await handlePageLoadOrNavigate();
      await updateDownloadButtonVisibility();
    });

    webview.addEventListener('did-navigate', async () => {
      try {
        const captured = await webview.executeJavaScript('window.__tribuCapturedPassword || sessionStorage.getItem("__tribuCapturedPassword") || null');
        if (captured && captured.length < 100) {
          capturedPasswordPending = captured;
        }
      } catch (e) {}
      await handlePageLoadOrNavigate();
      await updateSriActionButtonsVisibility();
    });

    webview.addEventListener('did-navigate-in-page', async () => {
      await updateSriActionButtonsVisibility();
    });

    webview.addEventListener('did-frame-finish-load', async () => {
      await updateSriActionButtonsVisibility();
    });

    webview.addEventListener('did-finish-load', async () => {
      await handlePageLoadOrNavigate();
      await updateSriActionButtonsVisibility();
    });

    // Iniciar monitor de verificación de página para el webview recién montado
    startSriPageMonitor();
  }

  // -------------------------------------------------------------
  // DETECCIÓN INTELIGENTE DE PÁGINAS Y BOTONES CONTEXTUALES (SRI)
  // -------------------------------------------------------------
  let sriPageCheckInterval = null;

  function startSriPageMonitor() {
    if (sriPageCheckInterval) clearInterval(sriPageCheckInterval);
    sriPageCheckInterval = setInterval(async () => {
      if (state.activeSection === 'sri' && currentWebview) {
        await updateSriActionButtonsVisibility();
      }
    }, 1500);
  }

  function stopSriPageMonitor() {
    if (sriPageCheckInterval) {
      clearInterval(sriPageCheckInterval);
      sriPageCheckInterval = null;
    }
  }

  async function checkIfOnComprobantesRecibidosPage() {
    if (!currentWebview) return false;
    try {
      const rawUrl = currentWebview.getURL() || '';
      let urlDecoded = rawUrl.toLowerCase();
      try {
        urlDecoded = decodeURIComponent(urlDecoded);
      } catch (e) {}

      // 0. EXCLUSIONES INMEDIATAS: Páginas como Perfil del contribuyente o Login de Keycloak
      if (
        urlDecoded.includes('/contribuyente/perfil') ||
        urlDecoded.includes('/sri-en-linea/contribuyente') ||
        urlDecoded.includes('/auth/realms/') ||
        urlDecoded.includes('/login')
      ) {
        return false;
      }

      // 1. Detección por URL Principal: Ruta canónica del servlet JSF de comprobantes recibidos
      if (
        urlDecoded.includes('comprobantesrecibidos.jsf') ||
        urlDecoded.includes('consultas/recibidos')
      ) {
        return true;
      }

      // Capa 2: Inspección semántica en el DOM del webview (títulos, encabezados, formularios e iframes)
      const domDetected = await currentWebview.executeJavaScript(`
        (function() {
          try {
            // 1. En el documento principal: Buscar en elementos de CONTENIDO (descartando menús laterales)
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, .ui-panel-title, form:not(#menuForm)'));
            for (const el of headings) {
              if (el.closest('nav, .sidebar, .menu, #menu, .ui-panelmenu, .navbar, .menu-lateral, #sidebar')) {
                continue;
              }
              const elText = el.innerText || '';
              if (elText.includes('Comprobantes electrónicos recibidos') || elText.includes('Comprobantes electronicos recibidos')) {
                const bodyText = (document.body ? document.body.innerText : '') || '';
                if (bodyText.includes('Periodo emisión') || bodyText.includes('Periodo emision') || bodyText.includes('Tipo de comprobante') || bodyText.includes('Ruc/Cédula/Pasaporte')) {
                  return true;
                }
              }
            }

            // 2. Verificar formularios o componentes PrimeFaces de la vista de consultas
            const hasForm = Boolean(document.querySelector('form[action*="comprobantesRecibidos"], form[id*="recibidos"], [id*="comprobantesRecibidos"]'));
            if (hasForm) return true;

            // 3. Verificar si el módulo está incrustado en un iframe dentro del portal
            const frames = Array.from(document.querySelectorAll('iframe'));
            for (const f of frames) {
              try {
                const src = (f.src || '').toLowerCase();
                if (src.includes('comprobantesrecibidos.jsf') || src.includes('consultas/recibidos')) return true;
                const fDoc = f.contentDocument || f.contentWindow.document;
                if (fDoc && fDoc.body) {
                  const fText = fDoc.body.innerText || '';
                  if (
                    (fText.includes('Comprobantes electrónicos recibidos') || fText.includes('Comprobantes electronicos recibidos')) &&
                    (fText.includes('Periodo emisión') || fText.includes('Periodo emision') || fText.includes('Tipo de comprobante'))
                  ) {
                    return true;
                  }
                }
              } catch (frameErr) {}
            }
          } catch (e) {}
          return false;
        })();
      `);

      return Boolean(domDetected);
    } catch (err) {
      return false;
    }
  }

  async function checkIfOnReclamoDiscapacidadPage() {
    if (!currentWebview) return false;
    try {
      const rawUrl = currentWebview.getURL() || '';
      let urlDecoded = rawUrl.toLowerCase();
      try {
        urlDecoded = decodeURIComponent(urlDecoded);
      } catch (e) {}

      // 0. EXCLUSIONES INMEDIATAS
      if (
        urlDecoded.includes('/contribuyente/perfil') ||
        urlDecoded.includes('/sri-en-linea/contribuyente') ||
        urlDecoded.includes('/auth/realms/') ||
        urlDecoded.includes('/login') ||
        urlDecoded.includes('comprobantesrecibidos.jsf')
      ) {
        return false;
      }

      // 1. Detección por URL Principal
      // https://srienlinea.sri.gob.ec/devolucionTerceraEdad-internet/pages/personasDiscapacidad/procesarPersonasDiscapacidad.jsf
      if (
        urlDecoded.includes('procesarpersonasdiscapacidad.jsf') ||
        urlDecoded.includes('personasdiscapacidad/procesar') ||
        (urlDecoded.includes('devolucionterceraedad-internet') && urlDecoded.includes('personasdiscapacidad'))
      ) {
        return true;
      }

      // 2. Inspección semántica en el DOM del webview (excluyendo menús de navegación)
      const domDetected = await currentWebview.executeJavaScript(`
        (function() {
          try {
            const tables = Array.from(document.querySelectorAll('table'));
            for (const tbl of tables) {
              if (tbl.closest('nav, .sidebar, .menu, #menu, .ui-panelmenu, .navbar, .menu-lateral, #sidebar')) {
                continue;
              }
              const txt = (tbl.innerText || '').toLowerCase();
              if (
                txt.includes('iva solicitado') &&
                (txt.includes('tipo de gasto') || txt.includes('alimentación') || txt.includes('alimentacion'))
              ) {
                return true;
              }
            }

            // Verificar iframes
            const frames = Array.from(document.querySelectorAll('iframe'));
            for (const f of frames) {
              try {
                const src = (f.src || '').toLowerCase();
                if (src.includes('procesarpersonasdiscapacidad.jsf') || src.includes('personasdiscapacidad')) {
                  return true;
                }
                const fDoc = f.contentDocument || f.contentWindow.document;
                if (fDoc && fDoc.body) {
                  const fText = fDoc.body.innerText.toLowerCase();
                  if (fText.includes('iva solicitado') && fText.includes('tipo de gasto')) {
                    return true;
                  }
                }
              } catch (frameErr) {}
            }
          } catch (e) {}
          return false;
        })();
      `);

      return Boolean(domDetected);
    } catch (err) {
      return false;
    }
  }

  async function updateSriActionButtonsVisibility() {
    if (state.activeSection !== 'sri' || !currentWebview) {
      if (btnTriggerBulkDownload) btnTriggerBulkDownload.style.display = 'none';
      if (btnDiscapacidadIva) btnDiscapacidadIva.style.display = 'none';
      return;
    }

    const [isRecibidosPage, isReclamoPage] = await Promise.all([
      checkIfOnComprobantesRecibidosPage(),
      checkIfOnReclamoDiscapacidadPage()
    ]);

    if (btnTriggerBulkDownload) {
      btnTriggerBulkDownload.style.display = isRecibidosPage ? 'inline-flex' : 'none';
    }

    if (btnDiscapacidadIva) {
      btnDiscapacidadIva.style.display = isReclamoPage ? 'inline-flex' : 'none';
    }
  }

  const updateDownloadButtonVisibility = updateSriActionButtonsVisibility;

  // Botón en banner para corregir la contraseña inmediatamente si fue errónea
  if (btnCorregirClaveBanner) {
    btnCorregirClaveBanner.addEventListener('click', () => {
      if (!state.activeClient) return;
      state.pendingClientForSession = state.activeClient;
      askPassClientName.textContent = `${state.activeClient.razonSocial} (${state.activeClient.ruc})`;
      inputAskPassword.value = '';
      inputAskPassword.type = 'password';
      btnToggleAskPassword.textContent = 'Ver';
      askPasswordModal.classList.add('active');
    });
  }

  // -------------------------------------------------------------
  // 6. MOTOR DE DESCARGA RÁPIDA (SOLO XML, ORDENADO POR MES)
  // -------------------------------------------------------------
  btnTriggerBulkDownload.addEventListener('click', async () => {
    if (state.activeSection !== 'sri') {
      switchMainSection('sri');
    }

    if (!currentWebview) return;

    try {
      const inspectScript = await window.tribuApi.getInspectScript();
      const info = await currentWebview.executeJavaScript(inspectScript);

      const totalRows = (info && (info.totalRowsOnPage || info.rowCount || (info.rows && info.rows.length))) || 0;
      if (!info || !info.hasTable || totalRows === 0) {
        alert('No se detectó ninguna tabla de comprobantes en la pantalla actual del SRI.\n\nVe a "Comprobantes electrónicos recibidos" o "emitidos", realiza la búsqueda de fechas, y presiona este botón nuevamente.');
        return;
      }

      bulkDetectedCategory.textContent = info.category || 'Comprobantes';
      bulkDetectedRows.textContent = totalRows;
      bulkDetectedPages.textContent = info.totalPages > 1 ? `${info.totalPages} páginas detectadas` : '1 página';

      bulkDownloadModal.classList.add('active');
    } catch (err) {
      alert('Error analizando la página del SRI: ' + err.message);
    }
  });

  btnCancelBulkModal.addEventListener('click', () => {
    bulkDownloadModal.classList.remove('active');
  });

  btnCloseBulkModal.addEventListener('click', () => {
    bulkDownloadModal.classList.remove('active');
  });

  btnConfirmBulkDownload.addEventListener('click', async () => {
    bulkDownloadModal.classList.remove('active');

    const scopeRadio = document.querySelector('input[name="downloadScope"]:checked');
    const downloadAllPages = scopeRadio ? scopeRadio.value === 'all' : true;

    startBulkDownloadProcess(downloadAllPages);
  });

  async function startBulkDownloadProcess(allPages = true) {
    if (state.isBulkDownloading || !currentWebview) return;

    state.isBulkDownloading = true;
    state.cancelBulkDownload = false;

    await window.tribuApi.resetDownloadStats();

    // Configurar estado inicial del panel flotante de descarga
    downloadProgressDrawer.classList.add('active');
    progressBarFill.style.width = '0%';
    progressPercentBadge.textContent = '0%';
    progressCompletedCount.textContent = '0';
    progressCurrentPage.textContent = '1';
    progressTotalPages.textContent = '1';
    progressTotalInBatch.textContent = '...';
    progressDrawerTitle.textContent = 'Descargando Comprobantes SRI';
    if (progressMetric1Label) progressMetric1Label.textContent = 'Comprobantes:';
    if (progressMetric2Label) progressMetric2Label.textContent = 'Página actual:';
    if (progressCurrentBoxLabel) progressCurrentBoxLabel.textContent = 'Archivo en proceso:';
    if (progressSpinner) progressSpinner.style.display = 'inline-block';
    if (btnCancelDownloadProcess) {
      btnCancelDownloadProcess.textContent = 'Detener Descarga';
      btnCancelDownloadProcess.style.display = 'inline-flex';
    }
    if (btnGoToAtsAfterDownload) btnGoToAtsAfterDownload.style.display = 'none';
    progressCurrentFile.textContent = 'Inspeccionando comprobantes en pantalla del SRI...';

    let totalDownloaded = 0;
    let pageNum = 1;

    try {
      while (!state.cancelBulkDownload) {
        const inspectScript = await window.tribuApi.getInspectScript();
        const pageInfo = await currentWebview.executeJavaScript(inspectScript);

        const rows = (pageInfo && pageInfo.rows) || [];
        const totalInPage = rows.length || (pageInfo ? (pageInfo.rowCount || pageInfo.totalRowsOnPage || 0) : 0);

        if (!pageInfo || !pageInfo.hasTable || totalInPage === 0) {
          if (pageNum === 1) {
            progressCurrentFile.textContent = 'No se encontraron filas con XMLs en la tabla actual.';
          }
          break;
        }

        const category = pageInfo.category || 'Compras';
        await window.tribuApi.setDownloadCategory(category);

        const totalPagesCount = Math.max(1, pageInfo.totalPages || 1);
        progressCurrentPage.textContent = pageNum;
        progressTotalPages.textContent = totalPagesCount;
        progressTotalInBatch.textContent = totalInPage;

        for (let i = 0; i < totalInPage; i++) {
          if (state.cancelBulkDownload) break;

          const rowData = rows[i] || {};
          const displayName = rowData.filename || `${rowData.fechaEmision || ''} ${rowData.razonSocial || 'Comprobante'}`.trim();
          progressCurrentFile.textContent = `[${i + 1}/${totalInPage}] ${displayName}`;

          // Calcular porcentaje global de avance
          const pageWeight = 100 / totalPagesCount;
          const currentPercent = Math.min(99, Math.round(((pageNum - 1) * pageWeight) + (((i + 1) / totalInPage) * pageWeight)));
          progressBarFill.style.width = `${currentPercent}%`;
          progressPercentBadge.textContent = `${currentPercent}%`;

          await window.tribuApi.setExpectedFileInfo({
            fechaEmision: rowData.fechaEmision,
            razonSocial: rowData.razonSocial,
            tipoComprobante: rowData.tipoComprobante,
            numeroComprobante: rowData.numeroComprobante,
            claveAcceso: rowData.claveAcceso,
            filename: rowData.filename,
            year: rowData.year,
            month: rowData.month
          });

          const getClickRow = window.tribuApi.getClickRowXmlScript || window.tribuApi.getClickRowScript;
          const clickScript = await getClickRow(i);
          const clickRes = await currentWebview.executeJavaScript(clickScript);

          if (clickRes && clickRes.success) {
            totalDownloaded++;
            progressCompletedCount.textContent = totalDownloaded;
          }

          // Pausa controlada para permitir que el portal del SRI responda y emita la descarga
          await new Promise(r => setTimeout(r, 650));
        }

        if (!allPages || state.cancelBulkDownload || pageNum >= totalPagesCount) {
          break;
        }

        progressCurrentFile.textContent = `Avanzando a la página ${pageNum + 1}...`;
        const nextScript = await window.tribuApi.getNextPageScript();
        const nextResult = await currentWebview.executeJavaScript(nextScript);

        if (nextResult && nextResult.hasNext) {
          pageNum++;
          progressCurrentPage.textContent = pageNum;
          progressCurrentFile.textContent = `Cargando página ${pageNum} del SRI...`;
          await new Promise(r => setTimeout(r, 2200));
        } else {
          break;
        }
      }

      if (state.cancelBulkDownload) {
        progressDrawerTitle.textContent = 'Descarga Detenida';
        if (progressSpinner) progressSpinner.style.display = 'none';
        progressCurrentFile.textContent = `Detenido: ${totalDownloaded} comprobantes.`;
        if (btnCancelDownloadProcess) btnCancelDownloadProcess.style.display = 'none';
        if (btnGoToAtsAfterDownload) btnGoToAtsAfterDownload.style.display = 'inline-flex';
        showBanner(`Descarga detenida: ${totalDownloaded} comprobantes.`, 'warning', 800);
        dismissProgressDrawer(600);
      } else {
        progressBarFill.style.width = '100%';
        progressPercentBadge.textContent = '100%';
        progressDrawerTitle.textContent = 'Descarga Finalizada';
        if (progressSpinner) progressSpinner.style.display = 'none';
        progressCurrentFile.textContent = `${totalDownloaded} comprobantes organizados.`;
        if (btnCancelDownloadProcess) btnCancelDownloadProcess.style.display = 'none';
        if (btnGoToAtsAfterDownload) btnGoToAtsAfterDownload.style.display = 'inline-flex';
        showBanner(`Descarga completada: ${totalDownloaded} comprobantes.`, 'success', 800);
        dismissProgressDrawer(500);
      }

      // Sincronizar automáticamente el módulo ATS con las nuevas descargas
      if (state.activeClient && atsModuleView) {
        try {
          await atsModuleView.activate(state.activeClient);
        } catch (atsErr) {
          console.warn('Aviso sincronizando ATS post-descarga:', atsErr);
        }
      }
    } catch (err) {
      console.error('Error durante la descarga masiva:', err);
      if (progressSpinner) progressSpinner.style.display = 'none';
      progressCurrentFile.textContent = 'Error: ' + err.message;
      showBanner('Error en descarga: ' + err.message, 'warning', 1000);
      dismissProgressDrawer(1000);
    } finally {
      state.isBulkDownloading = false;
    }
  }

  if (btnCancelDownloadProcess) {
    btnCancelDownloadProcess.addEventListener('click', () => {
      if (state.isBulkDownloading) {
        state.cancelBulkDownload = true;
        progressCurrentFile.textContent = 'Deteniendo proceso de descarga...';
      }
      if (state.isProcessingReclamo) {
        state.cancelReclamo = true;
        progressCurrentFile.textContent = 'Deteniendo reclamo automático...';
      }
    });
  }

  if (btnGoToAtsAfterDownload) {
    btnGoToAtsAfterDownload.addEventListener('click', () => {
      switchMainSection('ats');
      closeProgressDrawerImmediate();
    });
  }

  btnCloseProgressDrawer.addEventListener('click', () => {
    closeProgressDrawerImmediate();
  });

  // -------------------------------------------------------------
  // 7. ASISTENTE DE RECLAMO AUTOMÁTICO (DEVOLUCIÓN DE IVA SRI)
  // -------------------------------------------------------------
  btnDiscapacidadIva.addEventListener('click', async () => {
    if (state.activeSection !== 'sri') {
      switchMainSection('sri');
    }

    if (!currentWebview || state.isProcessingReclamo) return;

    try {
      // 1. Inspeccionar la tabla para contar filas válidas
      const inspectScript = await window.tribuApi.getInspectDiscapacidadScript();
      const info = await currentWebview.executeJavaScript(inspectScript);

      const totalRows = info ? (info.rowCount || info.rowsCount || info.totalRows || 0) : 0;

      if (!info || !info.hasTable || totalRows === 0) {
        openProgressDrawer('Reclamo Automático', 'No se detectó tabla de comprobantes.');
        if (progressSpinner) progressSpinner.style.display = 'none';
        if (btnCancelDownloadProcess) btnCancelDownloadProcess.style.display = 'none';
        dismissProgressDrawer(800);
        return;
      }

      state.isProcessingReclamo = true;
      state.cancelReclamo = false;
      btnDiscapacidadIva.disabled = true;
      btnDiscapacidadIva.style.opacity = '0.6';
      btnDiscapacidadIva.style.cursor = 'wait';

      // 2. Activar el Drawer Institucional de Progreso
      openProgressDrawer('Reclamo Automático', `Fase 1/2: Activando ${totalRows} comprobantes...`);
      progressBarFill.style.width = '0%';
      progressPercentBadge.textContent = '0%';
      progressCompletedCount.textContent = '0';
      progressTotalInBatch.textContent = totalRows;
      if (progressMetric1Label) progressMetric1Label.textContent = 'Comprobantes:';
      if (progressMetric2Label) progressMetric2Label.textContent = 'Completados:';
      progressCurrentPage.textContent = '0';
      progressTotalPages.textContent = totalRows;
      if (progressCurrentBoxLabel) progressCurrentBoxLabel.textContent = 'Comprobante actual:';
      if (progressSpinner) progressSpinner.style.display = 'inline-block';
      if (btnCancelDownloadProcess) {
        btnCancelDownloadProcess.textContent = 'Detener Reclamo';
        btnCancelDownloadProcess.style.display = 'inline-flex';
      }
      if (btnGoToAtsAfterDownload) btnGoToAtsAfterDownload.style.display = 'none';
      // FASE 1: Activar y seleccionar primero todas las filas de la tabla de comprobantes
      progressCurrentFile.textContent = `Fase 1/2: Activando casillas de ${totalRows} comprobantes...`;
      progressBarFill.style.width = '10%';
      progressPercentBadge.textContent = '10%';

      try {
        const activateScript = await window.tribuApi.getActivateAllReclamoRowsScript();
        await currentWebview.executeJavaScript(activateScript);
      } catch (actErr) {
        console.warn('Error en Fase 1 (activar comprobantes):', actErr);
      }

      // Pausa de estabilización para permitir a PrimeFaces / JSF habilitar los desplegables de todas las filas
      await new Promise(r => setTimeout(r, 450));

      if (state.cancelReclamo) {
        if (progressSpinner) progressSpinner.style.display = 'none';
        if (btnCancelDownloadProcess) btnCancelDownloadProcess.style.display = 'none';
        progressDrawerTitle.textContent = 'Reclamo Detenido';
        progressCurrentFile.textContent = 'Proceso detenido tras activar casillas.';
        dismissProgressDrawer(500);
        return;
      }

      // FASE 2: Colocar uno por uno el monto del IVA solicitado y el tipo de gasto
      progressCurrentFile.textContent = `Fase 2/2: Llenando monto y gasto...`;
      let processedCount = 0;

      for (let i = 0; i < totalRows; i++) {
        if (state.cancelReclamo) break;

        progressCurrentFile.textContent = `[${i + 1}/${totalRows}] Colocando monto y tipo de gasto...`;

        try {
          const rowScript = await window.tribuApi.getProcessReclamoRowScript(i);
          const res = await currentWebview.executeJavaScript(rowScript);

          if (i === 0 && res && res.debug) {
            try {
              await window.tribuApi.dumpDebug(res.debug);
            } catch (dbgErr) {}
          }

          if (res && res.success) {
            processedCount++;
            const pct = Math.round(((i + 1) / totalRows) * 100);
            progressBarFill.style.width = `${pct}%`;
            progressPercentBadge.textContent = `${pct}%`;
            progressCompletedCount.textContent = (i + 1);
            progressCurrentPage.textContent = processedCount;
            const shortName = (res.razonSocial || 'Comprobante').substring(0, 24);
            progressCurrentFile.textContent = `[${i + 1}/${totalRows}] ${shortName} - ${res.tipoGasto} | $${res.montoIva}`;
          }
        } catch (rowErr) {
          console.warn(`Error en fila ${i + 1}:`, rowErr);
        }

        // Breve pausa para dar fluidez visual y permitir eventos JSF/PrimeFaces
        await new Promise(r => setTimeout(r, 100));
      }

      // 4. Finalización / Cancelación (Únicamente en el Drawer)
      if (progressSpinner) progressSpinner.style.display = 'none';
      if (btnCancelDownloadProcess) btnCancelDownloadProcess.style.display = 'none';

      if (state.cancelReclamo) {
        progressDrawerTitle.textContent = 'Reclamo Detenido';
        progressCurrentFile.textContent = `${processedCount} de ${totalRows} comprobantes completados.`;
        dismissProgressDrawer(500);
      } else {
        progressBarFill.style.width = '100%';
        progressPercentBadge.textContent = '100%';
        progressDrawerTitle.textContent = 'Reclamo Finalizado';
        progressCurrentFile.textContent = `${processedCount} de ${totalRows} comprobantes completados.`;
        // Durar medio segundo (500ms) e irse desvaneciendo suavemente
        dismissProgressDrawer(500);
      }
    } catch (err) {
      if (progressSpinner) progressSpinner.style.display = 'none';
      progressCurrentFile.textContent = 'Error: ' + err.message;
      dismissProgressDrawer(1000);
    } finally {
      state.isProcessingReclamo = false;
      btnDiscapacidadIva.disabled = false;
      btnDiscapacidadIva.style.opacity = '1';
      btnDiscapacidadIva.style.cursor = 'pointer';
    }
  });

  if (btnCloseDiscapacidadModal) {
    btnCloseDiscapacidadModal.addEventListener('click', () => {
      discapacidadModal.classList.remove('active');
    });
  }

  if (btnCancelDiscapacidadModal) {
    btnCancelDiscapacidadModal.addEventListener('click', () => {
      discapacidadModal.classList.remove('active');
    });
  }

  if (selectDiscapacidadRango) {
    selectDiscapacidadRango.addEventListener('change', () => {
      if (selectDiscapacidadRango.value === 'custom') {
        groupCustomPorcentaje.style.display = 'block';
      } else {
        groupCustomPorcentaje.style.display = 'none';
      }
    });
  }

  if (btnExecuteDiscapacidadIva) {
    btnExecuteDiscapacidadIva.addEventListener('click', async () => {
      let porcentaje = 60;
      const val = selectDiscapacidadRango.value;

      if (val === 'custom') {
        porcentaje = parseFloat(inputCustomPorcentaje.value) || 60;
      } else if (val === '100_edad') {
        porcentaje = 100;
      } else {
        porcentaje = parseFloat(val) || 60;
      }

      const tipoGasto = selectDefaultTipoGasto.value || null;
      const checkAll = checkMarcarTodas.checked;

      discapacidadModal.classList.remove('active');
      showBanner(`Calculando y aplicando IVA solicitado (${porcentaje}%)...`, 'info');

      try {
        const applyScript = await window.tribuApi.getApplyDiscapacidadScript({
          porcentaje,
          tipoGasto,
          checkAll
        });

        const res = await currentWebview.executeJavaScript(applyScript);

        if (res && res.success) {
          const msg = `Ajuste completado en ${res.rowCount} facturas (${res.porcentaje}%). Total IVA original: $${res.totalOriginal.toFixed(2)} | Total IVA solicitado: $${res.totalCalculado.toFixed(2)}`;
          showBanner(msg, 'success', 8000);
        } else {
          showBanner('Error al aplicar el ajuste: ' + (res ? res.error : 'Fallo de ejecución'), 'warning', 5000);
        }
      } catch (e) {
        alert('Error ejecutando cálculo en el SRI: ' + e.message);
      }
    });
  }

  // -------------------------------------------------------------
  // 8. MÓDULOS DE NEGOCIO (ATS, REPORTES, DECLARACIONES)
  // -------------------------------------------------------------
  const atsModuleView = new window.AtsModuleView({
    api: window.tribuApi,
    getActiveClient: () => state.activeClient,
    showBanner: (msg, type, ms) => showBanner(msg, type, ms)
  });

  // -------------------------------------------------------------
  // UTILIDADES GENERALES
  // -------------------------------------------------------------
  let bannerTimer = null;

  function showBanner(message, type = 'info', autoHideMs = 0) {
    if (bannerTimer) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }

    automationBannerText.textContent = message;
    automationBanner.classList.remove('fade-out');
    automationBanner.className = `automation-banner show ${type}`;

    if (type !== 'warning' && btnCorregirClaveBanner) {
      btnCorregirClaveBanner.style.display = 'none';
    }

    // Desaparecer automáticamente (muy poco tiempo: ~600ms por defecto)
    const duration = autoHideMs > 0 ? autoHideMs : 600;

    if (duration > 0) {
      bannerTimer = setTimeout(() => {
        hideBanner();
      }, duration);
    }
  }

  function hideBanner() {
    if (bannerTimer) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    automationBanner.classList.add('fade-out');
    setTimeout(() => {
      automationBanner.classList.remove('show', 'fade-out');
    }, 200);
  }

  if (btnCloseBanner) {
    btnCloseBanner.addEventListener('click', hideBanner);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }

  // Inicialización de la aplicación
  await loadBaseFolder();
  await loadClients();
});
