var express = require('express');
var router = express.Router();
var Joi = require('joi');
var utils = require('./../shared/utils');
var discounts = require('../models/discount');

router.use(utils.protectedRouteCheck);

router.get(`/discounts`, (req, res) => {
    discounts.getAll(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        
        utils.handleError(res, error);
    });
});



router.get(`/discounts/:id`, (req, res) => {
    
    discounts.get(req.params.id).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/discounts`, (req, res) => {
    discounts.create(req.body).then(id => {
        res.send({ id });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/discounts/:id`, (req, res) => {
    discounts.update(req.params.id, req.body).then(() => {
        res.send({ status: `success` });
    }).catch(error => {
        utils.handleError(res, error);
        
    });
});

router.delete(`/discounts/:id`, (req, res) => {
    discounts.deleteDiscount(req.params.id).then(() => {
        res.send({ status: `success` });
    }).catch(error => {
        utils.handleError(res, error);
    });
});
module.exports = router;