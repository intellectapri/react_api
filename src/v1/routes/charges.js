var express = require('express');
var router = express.Router();

var utils = require('./../shared/utils');
var charges = require('./../models/charges');

router.post(`/purchases/:purchaseId/payment`, (req, res) => {
    req.body.purchaseId = req.params.purchaseId;
    charges.payment(req.body, req.session.user.userId).then(result => {
        res.send(result);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/purchases/:purchaseId/refund`, (req, res) => {
    req.body.purchaseId = req.params.purchaseId;
    charges.refund(req.body, req.session.user.userId).then(result => {
        res.send(result);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/purchases/:purchaseId/history`, (req, res) => {
    charges.history(req.params.purchaseId).then(result => {
        res.send(result);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.delete(`/purchases/charges/:chargeId`, (req, res) => {
    charges.deleteCharge(req.params.chargeId).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/purchases/charges/:chargeId`, (req, res) => {
    charges.updateCharge(req.params.chargeId, req.body, req.session.user.userId).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/purchases/charges/updateAll/:purchaseId`, (req, res) => {
    charges.updateChargesForPurchase(req.params.purchaseId, req.body, req.session.user.userId).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

module.exports = router;