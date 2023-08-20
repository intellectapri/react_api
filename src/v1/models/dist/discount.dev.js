"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var moment = require('moment');

var Joi = require('joi');

var utils = require('./../shared/utils');

var db = require('./../shared/db');

var _require = require('mysql2/lib/constants/charset_encodings'),
    join = _require.join;

var CodeGenerator = require("node-code-generator");

var allowedTypeCodesRegExp = /^(ABSOLUTE|RELATIVE)$/;
var schema = Joi.object().keys({
  discountID: Joi.number(),
  discountType: Joi.string().regex(allowedTypeCodesRegExp).required(),
  discountCode: Joi.string().required(),
  expireDate: Joi.string().required(),
  discountAmount: Joi.alternatives().when('discountType', {
    is: 'RELATIVE',
    then: Joi.number().min(1).max(100).required(),
    otherwise: Joi.number().min(1).required()
  }),
  active: Joi.number().required(),
  oneTimeUse: Joi.any().valid(1, 0, true, false),
  useCount: Joi.number()
});
/**
 * Return specific discount
 * 
 * @param {Number} discountId Discount identifier
 * 
 * @returns {Promise}
 */

var get = function get(discountId) {
  return new Promise(function (resolve, reject) {
    if (discountId > 0) {
      db.get().execute("SELECT * FROM discount WHERE discountID = ".concat(discountId), function (err, results) {
        if (err) {
          reject(err.message);
        } else if (results.length === 1) {
          resolve(results[0]);
        } else {
          reject(utils.errors.NOT_FOUND);
        }
      });
    } else {
      reject("Invalid discount identifier");
    }
  });
};

var getAll = function getAll(params) {
  return new Promise(function (resolve, reject) {
    var parameters = !!params ? Object.values(params) : [];
    var whereArgs = parseWhereClause(params);
    var where = parameters.length > 0 ? " WHERE ".concat(whereArgs) : '';
    db.get().execute("SELECT * FROM discount ".concat(where), function (err, results) {
      if (err) {
        reject(err.message);
      } else {
        resolve(results);
      }
    });
  });
};

var create = function create(data) {
  return new Promise(function (resolve, reject) {
    Joi.validate(data, schema).then(function () {
      var keyValues = prepareValues(data);
      discountExists(data.discountCode).then(function (exists) {
        if (exists) {
          reject('There is a code like this already');
        } else {
          db.get().execute("INSERT INTO discount SET ".concat(keyValues.join(',')), function (err, results) {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
        }
      })["catch"](function (err) {
        reject('We are not able to valid date the discount code');
      });
    })["catch"](function (err) {
      reject(err);
    });
  });
};

var parseWhereClause = function parseWhereClause(params) {
  if (_typeof(params) !== 'object' || !params) {
    return;
  }

  var args = [];

  if (params.active !== undefined) {
    args.push("active='".concat(params['active'], "'"));
  }

  if (params.discountCode) {
    args.push("discountCode LIKE '%".concat(params['discountCode'], "%'"));
  }

  return args.join(' AND ');
};

var discountExists = function discountExists(code) {
  if (!code) {
    return;
  }

  return new Promise(function (resolve, reject) {
    db.get().execute("SELECT discountID FROM discount WHERE discountCode='".concat(code, "'"), function (err, results) {
      if (err) {
        reject(err);
      }

      if (results[0]) {
        resolve(true);
      }

      resolve(false);
    });
  });
};

var prepareValues = function prepareValues(data) {
  if (data.length < 1) {
    return;
  }

  keyValuePairs = [];

  for (var key in data) {
    if (!!data[key]) {
      keyValuePairs.push("".concat(key, "='").concat(utils.sanitize(data[key]), "'"));
    } else {
      keyValuePairs.push("".concat(key, "='", 0, "'"));
    }
  }

  return keyValuePairs;
};

var update = function update(discountID, data) {
  return new Promise(function (resolve, reject) {
    Joi.validate(data, schema).then(function () {
      var keyValues = prepareValues(data);
      db.get().execute("UPDATE discount SET ".concat(keyValues.join(','), " WHERE discountID='").concat(discountID, "'"), function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    })["catch"](function (err) {
      reject(err);
    });
  });
};

var deleteDiscount = function deleteDiscount(discountId) {
  return new Promise(function (resolve, reject) {
    db.get().execute("UPDATE discount SET active='0' WHERE discountID='".concat(discountId, "'"), function (err, result) {
      if (err) {
        reject(err);
      }

      resolve(result);
    });
  });
};

var generateCode = function generateCode(number) {
  var generator = new CodeGenerator();
  var pattern = 'BONZAMS*+';
  var options = {
    existingCodesLoader: function existingCodesLoader(pattern) {
      return [];
    },
    sparsity: 100
  };
  return generator.generateCodes(pattern, number, options);
};

module.exports = {
  get: get,
  getAll: getAll,
  create: create,
  update: update,
  deleteDiscount: deleteDiscount,
  generateCode: generateCode
};