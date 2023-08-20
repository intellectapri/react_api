"use strict";

var express = require('express');

var router = express.Router();

var Joi = require('joi');

var utils = require('./../shared/utils');

var discounts = require('../models/discount');

router.use(utils.protectedRouteCheck);
router.get("/discounts", function (req, res) {
  discounts.getAll(req.query).then(function (results) {
    res.send(results);
  })["catch"](function (error) {
    console.log(error);
    utils.handleError(res, error);
  });
});
router.get("/discounts/:id", function (req, res) {
  discounts.get(req.params.id).then(function (results) {
    res.send(results);
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.post("/discounts", function (req, res) {
  discounts.create(req.body).then(function (id) {
    res.send({
      id: id
    });
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router.put("/discounts/:id", function (req, res) {
  discounts.update(req.params.id, req.body).then(function () {
    res.send({
      status: "success"
    });
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
router["delete"]("/discounts/:id", function (req, res) {
  discounts.deleteDiscount(req.params.id).then(function () {
    res.send({
      status: "success"
    });
  })["catch"](function (error) {
    utils.handleError(res, error);
  });
});
module.exports = router;