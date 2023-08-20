var express = require('express');
var router = express.Router();
var Joi = require('joi');
var utils = require('./../shared/utils');
var vouchers = require('../models/purchases');

router.use(utils.protectedRouteCheck);

router.get(`/vouchers`, (req, res) => {

    if(req.query.voucherCode){
        vouchers.searchVoucherTours(req.query).then( resp => {
            res.send(resp);
        }).catch( err => {
            utils.handleError(res, err);
        })
        return;
    }
    vouchers.getAll(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        
        utils.handleError(res, error);
    });
});

router.get(`/vouchers/:id`, (req, res) => {
    
    vouchers.getPurchase(req.params.id).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/vouchers`, (req, res) => {
    vouchers.create(req.body).then(id => {
        res.send({ id });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/vouchers/:id`, (req, res) => {
    vouchers.update(req.params.id, req.body).then(() => {
        res.send({ status: `success` });
    }).catch(error => {
        utils.handleError(res, error);
        
    });
});

router.delete(`/vouchers/:id`, (req, res) => {
    vouchers.delete(req.params.id).then(() => {
        res.send({ status: `success` });
    }).catch(error => {
        utils.handleError(res, error);
    });
});
module.exports = router;