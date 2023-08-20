/**
 * Reports
 */

const financeReports = require('./finance');
const futureReports = require('./future');
const futureMiscReports = require('./futureMisc');
const paymentReports = require('./payments');
const dailySalesReports = require('./dailySales');

module.exports = {
    finance: financeReports.finance,
    financeExport: financeReports.financeExport,
    financeMisc: financeReports.financeMisc,
    financeMiscExport: financeReports.financeMiscExport,
    future: futureReports.future,
    futureExport: futureReports.futureExport,
    futureMisc: futureMiscReports.futureMisc,
    futureMiscExport: futureMiscReports.futureMiscExport,
    payments: paymentReports.payments,
    paymentsExport: paymentReports.paymentsExport,
    dailySales: dailySalesReports.dailySales,
    dailySalesExport: dailySalesReports.dailySalesExport,
};
