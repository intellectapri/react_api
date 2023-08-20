var express = require('express');
var router = express.Router();
var Joi = require('joi');
var utils = require('./../shared/utils');

const purchases = require('./../models/purchases');
const tourPurchases = require('./../models/purchases/tour');
const tourPurchasesFind = require('./../models/purchases/tour.find');
const miscPurchases = require('./../models/purchases/misc');

router.use(utils.protectedRouteCheck);

router.get(`/purchases`, (req, res) => {
    purchases.search(req.query).then(results => {
        res.send(JSON.stringify(results));
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/purchases/checkins`, (req, res) => {
    tourPurchasesFind.findAllByCheckIn(req.query.date, (req.query.city ? req.query.city : ``)).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/purchases/isbookeddate`, (req, res) => {
    purchases.isBookedDate(req.query.productId, req.query.date).then(result => {
        res.send(result);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/purchases/:id`, (req, res) => {
    purchases.getPurchase(req.params.id).then(result => {
        if (result) {
            res.send(result);
        } else {
            utils.handleError(res, utils.errors.NOT_FOUND);
        }
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/purchases/tours/:id`, (req, res) => {
    purchases.getTourPurchase(req.params.id).then(result => {
        if (result) {
            res.send(result);
        } else {
            utils.handleError(res, utils.errors.NOT_FOUND);
        }
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/purchases/misc/:id`, (req, res) => {
    purchases.getMiscPurchase(req.params.id).then(result => {
        if (result) {
            res.send(result);
        } else {
            utils.handleError(res, utils.errors.NOT_FOUND);
        }
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.delete(`/purchases/:id`, (req, res) => {
    purchases.deleteMiscPurchase(req.params.id, req.session.user.userId, req.query.confirmationEmail).then(result => {
        if (result) {
            res.send(result);
        } else {
            utils.handleError(res, utils.errors.NOT_FOUND);
        }
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/purchases/tours`, (req, res) => {
    tourPurchases.create(req.body, req.session.user.userId).then(result => {
        res.send(result);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/purchases/tours/:id`, (req, res) => {
    let data = req.body;
    data.purchaseId = parseInt(data.purchaseId);
    data.detailId = parseInt(req.params.id);
    
    tourPurchases.update(data, req.session.user.userId).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
    
});

router.post(`/purchases/misc`, (req, res) => {
    let data = req.body;
    const schema = Joi.object().keys({purchaseDate: Joi.string().required()}).unknown(true);
    Joi.validate(data, schema).then(() => {
        miscPurchases.create(data, req.session.user.userId).then(result => {
            res.send(result);
        }).catch(error => {
            utils.handleError(res, error);
        });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/purchases/misc/:id`, (req, res) => {
    let data = req.body;
    data.purchaseId = req.params.id;
    const schema = Joi.object().keys({purchaseDate: Joi.string().required()}).unknown(true);
    Joi.validate(data, schema).then(() => {
        miscPurchases.update(data, req.session.user.userId).then(() => {
            res.send({ status: 'success' });
        }).catch(error => {
            utils.handleError(res, error);
        });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/purchases/misc/addtotour/:id`, (req, res) => {
    miscPurchases.addtotour(req.body, req.params.id).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/purchases/:id/checkin`, (req, res) => {
    tourPurchases.setCheckIn(req.params.id, (req.body.value === true || req.body.value === `true` ? 1 : 0)).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/purchases/:id/noshow`, (req, res) => {
    tourPurchases.setNoShow(req.params.id, (req.body.value === true || req.body.value === `true` ? 1 : 0)).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

module.exports = router;