var express = require('express');
var router = express.Router();

var utils = require('./../shared/utils');
var products = require('./../models/products');

router.use(utils.protectedRouteCheck);

router.get(`/products`, (req, res) => {
    products.list(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/products/order`, (req, res) => {
    products.updateOrder(req.body).then(() => {
        res.send({ status: `success` });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/products/:id/seasons`, (req, res) => {
    products.getSeasons(req.params.id).then(data => {
        res.send(data);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/products/:id/seasons`, (req, res) => {
    products.updateSeasons(parseInt(req.params.id), req.body, req.session.user.userId).then(() => {
        res.send({ status: `success` });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/products/types`, (req, res) => {
    products.getTypes().then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});


router.get(`/products/:id`, (req, res) => {
    products.get(req.params.id).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/products`, (req, res) => {
    products.create(req.body).then(id => {
        res.send({ id });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/products/:id`, (req, res) => {
    products.update(req.params.id, req.body).then(() => {
        res.send({ status: `success` });
    }).catch(error => {
        utils.handleError(res, error);
        
    });
});

router.delete(`/products/:id`, (req, res) => {
    products.delete(req.params.id).then(() => {
        res.send({ status: `success` });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/products/:id/tourPricing`, (req, res) => {
    products.tourPricing(parseInt(req.params.id), parseInt(req.query.bookingPartnerId), req.query.date).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/products/:id/miscPricing`, (req, res) => {
    products.miscPricing(req.params.id).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/products/:id/restore`, (req, res) => {
    products.restoreProduct(req.params.id).then(results => {
        res.send({status: `success`});
    }).catch(error => {
        utils.handleError(res, error);
    });
});

module.exports = router;