"use strict";

var express = require('express');

var router = express.Router();

var Joi = require('joi');

var utils = require('./../shared/utils');

var purchases = require('./../models/purchases');

var tourPurchases = require('./../models/purchases/tour');

var tourPurchasesFind = require('./../models/purchases/tour.find');

var miscPurchases = require('./../models/purchases/misc');

router.use(utils.protectedRouteCheck);
router.get("/purchases", function (req, res) {
  purchases.search(req.query).then(function (results) {
    res.send(JSON.stringify(results));
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.get("/purchases/checkins", function (req, res) {
  tourPurchasesFind.findAllByCheckIn(req.query.date, req.query.city ? req.query.city : "").then(function (results) {
    res.send(results);
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.get("/purchases/isbookeddate", function (req, res) {
  purchases.isBookedDate(req.query.productId, req.query.date).then(function (result) {
    res.send(result);
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.get("/purchases/:id", function (req, res) {
  purchases.getPurchase(req.params.id).then(function (result) {
    if (result) {
      res.send(result);
    } else {
      utils.handleError(res, utils.errors.NOT_FOUND);
    }
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.get("/purchases/tours/:id", function (req, res) {
  purchases.getTourPurchase(req.params.id).then(function (result) {
    if (result) {
      res.send(result);
    } else {
      utils.handleError(res, utils.errors.NOT_FOUND);
    }
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.get("/purchases/misc/:id", function (req, res) {
  purchases.getMiscPurchase(req.params.id).then(function (result) {
    if (result) {
      res.send(result);
    } else {
      utils.handleError(res, utils.errors.NOT_FOUND);
    }
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router["delete"]("/purchases/:id", function (req, res) {
  purchases.deleteMiscPurchase(req.params.id, req.session.user.userId, req.query.confirmationEmail).then(function (result) {
    if (result) {
      res.send(result);
    } else {
      utils.handleError(res, utils.errors.NOT_FOUND);
    }
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.post("/purchases/tours", function (req, res) {
  tourPurchases.create(req.body, req.session.user.userId).then(function (result) {
    res.send(result);
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.put("/purchases/tours/:id", function (req, res) {
  var data = req.body;
  data.purchaseId = parseInt(data.purchaseId);
  data.detailId = parseInt(req.params.id);
  tourPurchases.update(data, req.session.user.userId).then(function () {
    res.send({
      status: 'success'
    });
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.post("/purchases/misc", function (req, res) {
  var data = req.body;
  var schema = Joi.object().keys({
    purchaseDate: Joi.string().required()
  }).unknown(true);
  Joi.validate(data, schema).then(function () {
    miscPurchases.create(data, req.session.user.userId).then(function (result) {
      res.send(result);
    })["catch"](function (error) {
      utils.handleError(res, error);
    });
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.put("/purchases/misc/:id", function (req, res) {
  var data = req.body;
  data.purchaseId = req.params.id;
  var schema = Joi.object().keys({
    purchaseDate: Joi.string().required()
  }).unknown(true);
  Joi.validate(data, schema).then(function () {
    miscPurchases.update(data, req.session.user.userId).then(function () {
      res.send({
        status: 'success'
      });
    })["catch"](function (error) {
      utils.handleError(res, error);
    });
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.post("/purchases/misc/addtotour/:id", function (req, res) {
  miscPurchases.addtotour(req.body, req.params.id).then(function () {
    res.send({
      status: 'success'
    });
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.post("/purchases/:id/checkin", function (req, res) {
  tourPurchases.setCheckIn(req.params.id, req.body.value === true || req.body.value === "true" ? 1 : 0).then(function () {
    res.send({
      status: 'success'
    });
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.post("/purchases/:id/noshow", function (req, res) {
  tourPurchases.setNoShow(req.params.id, req.body.value === true || req.body.value === "true" ? 1 : 0).then(function () {
    res.send({
      status: 'success'
    });
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
module.exports = router;