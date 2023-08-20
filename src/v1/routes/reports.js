/**
 * Reports routes
 */

const express = require('express');
const router = express.Router();
const utils = require('./../shared/utils');

const reports = require('./../models/reports');

router.use(utils.protectedRouteCheck);

router.get(`/reports/monthByMonth`, (req, res) => {
    reports.monthByMonth().then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/payments`, (req, res) => {
    reports.payments(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/payments/export`, (req, res) => {
    reports.paymentsExport(req.query).then(CSVReady => {
        res.setHeader("Cache-Control", "must-revalidate, post-check=0, pre-check=0");
        res.setHeader("Content-Length", CSVReady.length);
        res.setHeader("Content-type", "text/csv");
        res.setHeader("Content-type", "application/csv");
        res.setHeader("Content-Disposition", "attachment; filename=payments-report.csv");

        res.send(CSVReady);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/future`, (req, res) => {
    reports.future(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/future/export`, (req, res) => {
    reports.futureExport(req.query).then(CSVReady => {
        res.setHeader("Cache-Control", "must-revalidate, post-check=0, pre-check=0");
        res.setHeader("Content-Length", CSVReady.length);
        res.setHeader("Content-type", "text/csv");
        res.setHeader("Content-type", "application/csv");
        res.setHeader("Content-Disposition", "attachment; filename=future-report.csv");

        res.send(CSVReady);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/future-misc`, (req, res) => {
    reports.futureMisc(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/future-misc/export`, (req, res) => {
    reports.futureMiscExport(req.query).then(CSVReady => {
        res.setHeader("Cache-Control", "must-revalidate, post-check=0, pre-check=0");
        res.setHeader("Content-Length", CSVReady.length);
        res.setHeader("Content-type", "text/csv");
        res.setHeader("Content-type", "application/csv");
        res.setHeader("Content-Disposition", "attachment; filename=future-report.csv");

        res.send(CSVReady);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/finance-tours`, (req, res) => {
    reports.finance(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/finance-tours/export`, (req, res) => {
    reports.financeExport(req.query).then(CSVReady => {
        res.setHeader("Cache-Control", "must-revalidate, post-check=0, pre-check=0");
        res.setHeader("Content-Length", CSVReady.length);
        res.setHeader("Content-type", "text/csv");
        res.setHeader("Content-type", "application/csv");
        res.setHeader("Content-Disposition", "attachment; filename=finance-tours-report.csv");

        res.send(CSVReady);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/finance-misc`, (req, res) => {
    reports.financeMisc(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/finance-misc/export`, (req, res) => {
    reports.financeMiscExport(req.query).then(CSVReady => {
        res.setHeader("Cache-Control", "must-revalidate, post-check=0, pre-check=0");
        res.setHeader("Content-Length", CSVReady.length);
        res.setHeader("Content-type", "text/csv");
        res.setHeader("Content-type", "application/csv");
        res.setHeader("Content-Disposition", "attachment; filename=finance-misc-report.csv");

        res.send(CSVReady);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/daily-sales`, (req, res) => {
    reports.dailySales(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/reports/daily-sales/export`, (req, res) => {
    reports.dailySales(req.query).then(CSVReady => {
        res.setHeader("Cache-Control", "must-revalidate, post-check=0, pre-check=0");
        res.setHeader("Content-Length", CSVReady.length);
        res.setHeader("Content-type", "text/csv");
        res.setHeader("Content-type", "application/csv");
        res.setHeader("Content-Disposition", "attachment; filename=daily-sales-report.csv");

        res.send(CSVReady);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

module.exports = router;