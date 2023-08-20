/**
 * Allotments routes
 */

const express = require('express');
const router = express.Router();
const utils = require('./../shared/utils');

const allotments = require('./../models/allotments');

router.use(utils.protectedRouteCheck);

router.get(`/allotments`, (req, res) => {
    allotments.search(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/allotments/events`, (req, res) => {
    allotments.events(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/allotments`, (req, res) => {
    allotments.createOrUpdate(req.body).then(results => {
        res.send({ status: 'success'});
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/allotments/available`, (req, res) => {
    allotments.available(req.query).then(numberOfAvailableSlots => {
        res.send({ available: numberOfAvailableSlots });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/allotments/overbooked`, (req, res) => {
    allotments.overbooked(req.query).then(result => {
        res.send(result);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

module.exports = router;