var express = require('express');
var router = express.Router();
var utils = require('./../shared/utils');

const bookingPartners = require('./../models/bookingPartners');
const purchases = require('./../models/purchases');

router.use(utils.protectedRouteCheck);

/**
 * Searching for booking partners according to provided filters
 */
router.get(`/bookingPartners`, (req, res) => {
    bookingPartners.search(req.query).then(results => {
        res.send(JSON.stringify(results));
    }).catch(error => {
        console.log(error);
        res.status(500).json({ error: `ERROR_OCCURED` });
    });
});

/**
 * Create booking partner
 */
router.post(`/bookingPartners`, (req, res) => {
    bookingPartners.create(req.body).then(results => {
        res.send(JSON.stringify(results));
    }).catch(error => {
        utils.handleError(res, error);
    });
});

/**
 * Return specific booking partner
 */
router.get(`/bookingPartners/:id`, (req, res) => {
    bookingPartners.get(req.params.id).then(results => {
        res.send(JSON.stringify(results));
    }).catch(error => {
        utils.handleError(res, error);
    });
});

/**
 * Update specific booking partner
 */
router.put(`/bookingPartners/:id`, (req, res) => {
    bookingPartners.update(req.params.id, req.body).then(results => {
        res.send(JSON.stringify(results));
    }).catch(error => {
        utils.handleError(res, error);
    });
});

/**
 * Delete specific booking partner
 */
router.delete(`/bookingPartners/:id`, (req, res) => {
    bookingPartners.delete(req.params.id).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

/**
 * Return booking partner commission
 */
router.get(`/bookingPartners/:id/commission`, (req, res) => {
    bookingPartners.commission(req.params.id).then(results => {
        res.send(JSON.stringify(results));
    }).catch(error => {
        utils.handleError(res, error);
    });
});

/**
 * Return booking partner purchases
 */
router.get(`/bookingPartners/:id/purchases`, (req, res) => {
    purchases.findAllByCustomerId(req.params.id, req.params).then(results => {
        res.send(JSON.stringify(results));
    }).catch(error => {
        utils.handleError(res, error);
    });
});

module.exports = router;