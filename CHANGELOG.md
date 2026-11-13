# Registro de Cambios (Changelog) - TRIBU

Todas las modificaciones notables y actualizaciones de TRIBU se documentan en este archivo.

## [v0.1.6] - 2026-11-13

Esta version representa una evolucion integral en TRIBU, introduciendo el nuevo Modulo de Conciliacion Tributaria, gestion avanzada de retenciones en la fuente, soporte normativo completo para ATS en ceros y empaquetado ZIP oficial, visor RIDE interactivo con interceptacion de descargas en el SRI, autollenado asistido del Formulario 104 de IVA y un rediseno ergonomico de la experiencia de usuario.

### Novedades y Caracteristicas Principales

- Modulo Integral de ATS (Anexo Transaccional Simplificado) y Empaquetado ZIP Oficial:
  - Generacion y empaquetado automatico del anexo en archivo comprimido ZIP con la nomenclatura y estructura tecnica oficial exigida por el SRI (AT[MM][AAAA].zip).
  - Motor de validacion normativa que comprueba longitudes de RUC/cedula, coherencia de periodos y parametros fiscales antes de la exportacion.
  - Generacion de Anexo ATS en Ceros para contribuyentes sin movimientos de compras ni ventas en el periodo, permitiendo la seleccion sin restricciones de cualquier mes del ejercicio fiscal.
  - Exportacion de reportes consolidados en formato CSV delimitado por punto y coma, listo para analisis inmediato en Microsoft Excel o LibreOffice Calc.

- Modulo de Retenciones AIR e IVA:
  - Extraccion y consolidacion automatica de retenciones en la fuente de Impuesto a la Renta (AIR) y retenciones de IVA desde comprobantes electronicos tipo 07 y facturas con retencion implicita.
  - Mapeo automatico de codigos de concepto de retencion SRI (ej. 312, 303, 304, etc.) y desgloses de bases imponibles.

- Gestion de Comprobantes Fisicos y Anulados:
  - Registro, persistencia local y administracion de comprobantes de compras y retenciones emitidas en formato fisico (no electronico).
  - Generacion y serializacion del bloque de comprobantes <anulados> en el XML del anexo ATS.

- Conciliador Tributario ATS vs Formulario 104 y Formulario 103:
  - Cruce automatico de informacion entre comprobantes procesados en el ATS y los casilleros oficiales de las declaraciones del SRI.
  - Previsualizacion y cuadre al centavo de bases imponibles gravadas con tarifa general, tarifa 0%, no objeto de IVA, exento de IVA, credito tributario aplicable y total de retenciones a declarar.
  - Deteccion preventiva de inconsistencias o discrepancias que podrian ocasionar observaciones tributarias por parte de la administracion.

- Visor Flotante RIDE Oficial del SRI e Interceptacion Inteligente:
  - Renderizado fiel de la representacion impresa (RIDE) de facturas electronicas con formato oficial del SRI, incluyendo generacion de codigo de barras Code 128 en formato vectorial (SVG).
  - Desglose detallado de informacion tributaria: emisor, adquirente, tabla pormenorizada de items y productos, formas de pago y datos adicionales.
  - Interceptacion en tiempo real de clics en botones de descarga de RIDE (PDF) y XML dentro del portal web del SRI, desplegando la vista previa interactiva al instante sin duplicar descargas innecesarias.
  - Botones de accion rapida integrados en la ventana de vista previa: descargar PDF, descargar XML, imprimir directamente y copiar clave de acceso de 49 digitos al portapapeles.

- Modulo de Declaracion de IVA (Formulario 104):
  - Asistente de precalculo y diagnostico automatico de casilleros de ventas y compras a partir de los comprobantes electronicos autorizados.
  - Autollenado asistido y guia visual para la declaracion en linea en el portal del SRI.

- Descarga Masiva de Comprobantes Emitidos (Ventas):
  - Implementacion de descarga iterativa dia por dia para comprobantes de venta emitidos, superando la limitacion tecnica de fechas del portal JSF del SRI.
  - Enrutamiento SSO autenticado y navegacion interactiva asistida para mantener la sesion activa durante operaciones masivas.
  - Organizacion automatica de archivos en el disco local: [Carpeta Base]/[Cliente]/[Ano]/[Mes]/[Tipo]/.

### Mejoras de Interfaz de Usuario y Experiencia (UI/UX)

- Tarjeta Cuadrada Entrecortada para Nuevo Cliente:
  - Sustitucion del boton de barra superior por una tarjeta cuadrangular con borde entrecortado (border: 2px dashed) que se posiciona en primer lugar dentro de la cuadricula de clientes.
  - Icono central de suma y estados interactivos hover con realce sutil y adaptacion a temas claro y oscuro.
- Revelacion Progresiva de Secciones de Navegacion:
  - Ocultamiento preventivo de las pestanas secundarias (SRI, ATS, Declaracion IVA) hasta que se inicie sesion con un cliente registrado o se cree un nuevo contribuyente.
- Desaturacion y Ergonomia en la Barra de Herramientas ATS:
  - Reorganizacion jerarquica de filtros y selectores de periodo (Ano/Mes/Todos los meses).
  - Menu desplegable "Mas Herramientas" que agrupa acciones avanzadas (ATS en Ceros, Registro de Fisicos, Registro de Anulados, Conciliacion Tributaria) para mantener la interfaz despejada y libre de sobrecarga cognitiva.

### Correcciones y Estabilidad

- Salvaguarda de Pantalla de Carga (Splash Screen):
  - Correccion del bloqueo intermitente en la pantalla de inicio asegurando la eliminacion garantizada del elemento tras la carga del DOM y la configuracion de IPC.
- Limpieza Rigurosa de Pruebas:
  - Protocolo de auto-limpieza estricta que remueve carpetas de clientes temporales, archivos mock y caches tras la ejecucion del suite de pruebas automatizadas.
- Optimizacion del Motor de Actualizaciones:
  - Comprobacion automatica de versiones en segundo plano cada 2 horas con instalacion nativa silenciosa.

---

## [v0.1.5] - 2026-11-12

- Implementacion de actualizador nativo in-place para macOS resolviendo restricciones de Gatekeeper.
- Incorporacion de iconos oficiales de aplicacion para instaladores de Windows (.exe) y macOS (.dmg).
- Indicador visual de version en el encabezado y campana de notificaciones de actualizacion.
- Integracion de comprobacion automatica de nuevas versiones desde repositorios oficiales.

---

## [v0.1.4] - 2026-11-11

- Sistema de gestion de clientes con almacenamiento seguro y cifrado local de credenciales (AES-256).
- Protocolo de deteccion y gestion de clientes homonimos o duplicados en carpetas locales.
- Optimizacion del selector inteligente de categorias de gasto para devolucion de IVA por discapacidad y tercera edad.

---

## [v0.1.3] - 2026-11-10

- Asistente de reclamo automatico de IVA en dos fases con notificaciones de progreso.
- Descarga automatizada de comprobantes electronicos recibidos (compras) desde el portal del SRI.
- Soporte inicial para ejecucion multi-plataforma en Windows 10/11 y macOS.
