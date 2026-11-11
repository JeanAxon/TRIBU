/**
 * Proxy hacia el módulo modularizado de ATS
 * Para nuevas funcionalidades, utilizar src/modules/ats/
 */
const ats = require('../modules/ats/atsGenerator');
const csv = require('../modules/ats/csvExporter');

module.exports = {
  ...ats,
  ...csv
};
