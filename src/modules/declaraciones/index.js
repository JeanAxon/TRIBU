/**
 * Módulo Autónomo de Declaraciones de IVA (Formulario 104) - SRI Ecuador
 * TRIBU - Asistente Contable
 * 
 * Regla de estilo: Cero emojis en código, comentarios y salidas.
 */

const fs = require('fs');
const path = require('path');
const xmlParser = require('../ats/xmlParser');
const ivaCalculator = require('./ivaCalculator');
const declaracionesStorage = require('./declaracionesStorage');

class DeclaracionesModule {
  constructor() {
    this.name = 'declaraciones-module';
    this.version = '1.0.0';
  }

  registerIpc(ipcMain) {
    if (!ipcMain) {
      throw new Error('Se requiere ipcMain para registrar el módulo Declaraciones');
    }

    // 1. Obtener diagnóstico integral y cálculo de la declaración para un periodo
    ipcMain.handle('declaraciones:get-period-data', async (event, params) => {
      return this.getPeriodDeclaracionData(params);
    });

    // 2. Guardar ajustes manuales o confirmación del borrador
    ipcMain.handle('declaraciones:save-period-data', async (event, { clientRuc, year, month, data }) => {
      return declaracionesStorage.saveDeclaracion(clientRuc, year, month, data);
    });

    // 3. Obtener periodos disponibles para el cliente
    ipcMain.handle('declaraciones:get-available-periods', async (event, clientFolder) => {
      return xmlParser.getAvailablePeriods(clientFolder);
    });
  }

  /**
   * Carga comprobantes de compras, ventas y retenciones para el período,
   * evalúa el diagnóstico de integridad y ejecuta el cálculo tributario
   */
  async getPeriodDeclaracionData({
    client,
    clientFolder,
    year,
    month,
    confirmaciones = {},
    ajustesManuales = {}
  }) {
    try {
      if (!client || !clientFolder || !year || !month) {
        return {
          success: false,
          error: 'Faltan parámetros obligatorios (cliente, carpeta, año o mes)'
        };
      }

      // 1. Cargar comprobantes de Compras
      const comprasRes = xmlParser.loadPeriodXmls(clientFolder, {
        category: 'Compras',
        year,
        month
      });
      const comprasDocs = (comprasRes && comprasRes.items) ? comprasRes.items : [];

      // 2. Cargar comprobantes de Ventas
      const ventasRes = xmlParser.loadPeriodXmls(clientFolder, {
        category: 'Ventas',
        year,
        month
      });
      const ventasDocs = (ventasRes && ventasRes.items) ? ventasRes.items : [];

      // 3. Separar comprobantes de Retención Recibidos y Emitidos
      // En Compras pueden venir facturas o retenciones recibidas;
      // En Ventas pueden venir facturas o retenciones emitidas.
      // También escaneamos carpeta 'Retenciones' si existe.
      const retencionesRecibidasDocs = [];
      const retencionesEmitidasDocs = [];

      // Filtrar de compras
      for (const doc of comprasDocs) {
        if (doc && doc.tipoDoc === '07') {
          retencionesRecibidasDocs.push(doc);
        }
      }

      // Filtrar de ventas
      for (const doc of ventasDocs) {
        if (doc && doc.tipoDoc === '07') {
          retencionesEmitidasDocs.push(doc);
        }
      }

      // Escaneo directo de carpeta opcional 'Retenciones'
      const retencionesFolder = path.join(clientFolder, 'Retenciones', String(year), String(month));
      if (fs.existsSync(retencionesFolder)) {
        try {
          const files = fs.readdirSync(retencionesFolder).filter(f => f.toLowerCase().endsWith('.xml'));
          for (const f of files) {
            const parsed = xmlParser.parseXmlFile(path.join(retencionesFolder, f));
            if (parsed && parsed.success) {
              if (parsed.tipoDoc === '07') {
                retencionesRecibidasDocs.push(parsed);
              }
            }
          }
        } catch (e) {
          console.warn('Error leyendo carpeta opcional Retenciones:', e);
        }
      }

      // 4. Diagnóstico de Integridad (Semáforo)
      const countCompras = comprasDocs.filter(d => d.tipoDoc !== '07').length;
      const countVentas = ventasDocs.filter(d => d.tipoDoc !== '07').length;
      const countRetRecibidas = retencionesRecibidasDocs.length;
      const countRetEmitidas = retencionesEmitidasDocs.length;

      const comprasOk = countCompras > 0 || Boolean(confirmaciones.comprasEnCero);
      const ventasOk = countVentas > 0 || Boolean(confirmaciones.ventasEnCero);
      const retencionesOk = countRetRecibidas > 0 || Boolean(confirmaciones.retencionesRecibidasEnCero);

      const advertencias = [];
      if (countVentas === 0 && !confirmaciones.ventasEnCero) {
        advertencias.push({
          tipo: 'VENTAS_FALTANTES',
          mensaje: 'No se encontraron ventas emitidas para este período',
          categoria: 'Ventas',
          accionSugerida: 'Descargar Ventas en el SRI o confirmar mes sin ventas ($0)'
        });
      }

      if (countCompras === 0 && !confirmaciones.comprasEnCero) {
        advertencias.push({
          tipo: 'COMPRAS_FALTANTES',
          mensaje: 'No se encontraron compras recibidas para este período',
          categoria: 'Compras',
          accionSugerida: 'Descargar Compras en el SRI o confirmar mes sin compras ($0)'
        });
      }

      let statusSemaforo = 'VERDE';
      if (!ventasOk || !comprasOk) {
        statusSemaforo = 'AMARILLO';
      }

      // 5. Arrastre de saldos de mes anterior desde almacenamiento histórico
      const saldosAnteriores = declaracionesStorage.getPreviousMonthBalances(client.ruc, year, month);

      // 6. Ejecutar cálculo matemático
      const calculo = ivaCalculator.calculateDeclaracionIva({
        client,
        year,
        month,
        comprasDocs: comprasDocs.filter(d => d.tipoDoc !== '07'),
        ventasDocs: ventasDocs.filter(d => d.tipoDoc !== '07'),
        retencionesRecibidasDocs,
        retencionesEmitidasDocs,
        saldosAnteriores,
        ajustesManuales,
        confirmaciones
      });

      return {
        success: true,
        diagnostico: {
          compras: {
            count: countCompras,
            totalNeto: calculo.casilleros.c519,
            ivaPagado: calculo.casilleros.c520,
            confirmedEmpty: Boolean(confirmaciones.comprasEnCero),
            ok: comprasOk
          },
          ventas: {
            count: countVentas,
            totalNeto: calculo.casilleros.c419,
            ivaGenerado: calculo.casilleros.c499,
            confirmedEmpty: Boolean(confirmaciones.ventasEnCero),
            ok: ventasOk
          },
          retencionesRecibidas: {
            count: countRetRecibidas,
            totalIvaRetenido: calculo.casilleros.c609,
            confirmedEmpty: Boolean(confirmaciones.retencionesRecibidasEnCero),
            ok: retencionesOk
          },
          retencionesEmitidas: {
            count: countRetEmitidas,
            totalRetenidoAgente: calculo.casilleros.c801,
            confirmedEmpty: Boolean(confirmaciones.retencionesEmitidasEnCero),
            ok: true
          },
          statusSemaforo,
          advertencias,
          listoParaDeclarar: statusSemaforo === 'VERDE'
        },
        saldosAnteriores,
        resumenEjecutivo: calculo.resumenEjecutivo,
        casilleros: calculo.casilleros,
        perfilamiento: calculo.perfilamiento
      };

    } catch (err) {
      console.error('Error calculando datos de declaración:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }
}

module.exports = new DeclaracionesModule();
