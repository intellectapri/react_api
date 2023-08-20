"use strict";

/**
 * Charges
 */
var Joi = require('joi');

var utils = require('./../../shared/utils');

var db = require('./../../shared/db');

var balance = require('./balance').balance;

var purchases = require('./../purchases/tour');

var config = require('./../../../../config/config');

var voucher = require('../discount');
/**
 * Creates payment for purchase
 * 
 * @param {Object} data   Payment information
 * @param {String} userId Author user identifier
 * 
 * @returns {Promise}
 */


var payment = function payment(data, userId) {
  return new Promise(function (resolve, reject) {
    Joi.validate(data, Joi.object().keys({
      purchaseId: Joi.number().integer().required(),
      paymentDate: Joi.string().regex(utils.DATE_CHECK_REGEXP),
      amount: Joi.number().precision(2).required(),
      method: Joi.string().required(),
      internalNotes: Joi.string().optional().allow('')
    })).then(function () {
      var insertValues = [];
      insertValues.push(" purchaseID = ".concat(utils.sanitize(data.purchaseId), " "));
      insertValues.push(" paymentDate = '".concat(utils.sanitize(data.paymentDate), "' "));
      insertValues.push(" type = 'payment' ");
      insertValues.push(" amount = ".concat(utils.sanitize(data.amount), " "));
      insertValues.push(" method = '".concat(utils.sanitize(data.method), "' "));
      if (data.internalNotes) insertValues.push(" internalNotes = '".concat(utils.sanitize(data.internalNotes), "' "));
      insertValues.push(" addedTime = NOW() ");
      insertValues.push(" addedStaff = ".concat(userId, " "));
      db.get().execute("INSERT INTO charge SET ".concat(insertValues.join(",")), function (err, results) {
        if (err) {
          reject(err.message);
        } else if (results.insertId >= 0) {
          resolve({
            id: results.insertId
          });
        } else {
          reject('Unable to create charge');
        }
      });
    })["catch"](function (error) {
      reject(error.toString());
    });
  });
};
/**
 * Creates refund for purchase
 * 
 * @param {Object} data Refund information
 * 
 * @returns {Promise}
 */


var refund = function refund(data, userId) {
  return new Promise(function (resolve, reject) {
    Joi.validate(data, Joi.object().keys({
      purchaseId: Joi.number().integer().required(),
      paymentDate: Joi.string().regex(utils.DATE_CHECK_REGEXP),
      amount: Joi.number().precision(2),
      method: Joi.string().required(),
      refundReason: Joi.string().required(),
      internalNotes: Joi.string().optional().allow('')
    })).then(function () {
      var insertValues = [];
      insertValues.push(" purchaseID = ".concat(utils.sanitize(data.purchaseId), " "));
      insertValues.push(" paymentDate = '".concat(utils.sanitize(data.paymentDate), "' "));
      insertValues.push(" type = 'refund' ");
      insertValues.push(" amount = ".concat(utils.sanitize(data.amount), " "));
      insertValues.push(" method = '".concat(utils.sanitize(data.method), "' "));
      insertValues.push(" refundReason = '".concat(utils.sanitize(data.refundReason), "' "));
      if (data.internalNotes) insertValues.push(" internalNotes = '".concat(utils.sanitize(data.internalNotes), "' "));
      insertValues.push(" addedTime = NOW() ");
      insertValues.push(" addedStaff = ".concat(userId, " "));
      balance(data.purchaseId).then(function (balanceAmount) {
        db.get().execute("SELECT totalNet FROM purchase WHERE purchaseID = ".concat(parseInt(data.purchaseId)), function (err, result) {
          if (err) {
            reject(err.message);
            return;
          }

          var fullRefund = false;

          if (result.length === 1) {
            fullRefund = parseFloat(data.amount) === parseFloat(balanceAmount);
          }

          db.get().execute("INSERT INTO charge SET ".concat(insertValues.join(",")), function (err, results) {
            if (err) {
              reject(err.message);
              return;
            }

            if (results.insertId >= 0) {
              if (fullRefund) {
                purchases.setPurchaseAsRefunded(data.purchaseId).then(function () {
                  resolve({
                    id: results.insertId
                  });
                })["catch"](reject);
              } else {
                resolve({
                  id: results.insertId
                });
              }
            } else {
              reject('Unable to create charge');
            }
          });
        });
      })["catch"](reject);
    })["catch"](function (error) {
      reject(error.toString());
    });
  });
};
/**
 * Returns payment history for purchase
 * 
 * @param {Number} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */


var history = function history(purchaseId) {
  return new Promise(function (resolve, reject) {
    if (parseInt(purchaseId) > 0) {
      db.get().execute("SELECT totalNet, customerID FROM purchase WHERE purchaseID = ".concat(parseInt(purchaseId)), function (err, results) {
        if (err) {
          reject(err.message);
        } else if (results.length === 1) {
          db.get().execute("SELECT * FROM customer WHERE customerID = ".concat(parseInt(results[0].customerID)), function (err, bookingPartnerData) {
            if (err) {
              reject(err.message);
            } else {
              var totalNet = 0;
              if (results.length === 1 && results[0].totalNet) totalNet = parseFloat(results[0].totalNet);
              db.get().execute("SELECT * FROM charge WHERE purchaseID = ".concat(parseInt(purchaseId)), function (err, results) {
                if (err) {
                  reject(err.message);
                } else {
                  var bookingPartnerPaymentMethod = false;

                  if (bookingPartnerData && bookingPartnerData[0].paymentMethod && config.paymentMethods.indexOf(bookingPartnerData[0].paymentMethod) > -1) {
                    bookingPartnerPaymentMethod = bookingPartnerData[0].paymentMethod;
                  }

                  db.get().execute("SELECT voucherIDs FROM purchase_tour WHERE purchaseID='".concat(purchaseId, "'"), function (err, res) {
                    if (err) {
                      reject(err.message);
                    }

                    if (res.length > 0 && res[0]['voucherIDs']) {
                      res[0]['voucherIDs'].split(',').map(function (voucherId) {
                        voucher.get(voucherId).then(function (discount) {
                          voucher.update(voucherId, {
                            discountCode: discount.discountCode,
                            discountAmount: discount.discountAmount,
                            discountType: discount.discountType,
                            expireDate: discount.expireDate,
                            oneTimeUse: discount.oneTimeUse,
                            useCount: discount.useCount,
                            active: 0
                          });
                          resolve({
                            totalNet: totalNet,
                            history: results,
                            bookingPartnerPaymentMethod: bookingPartnerPaymentMethod
                          });
                        })["catch"](function (err) {
                          reject(err.message);
                        });
                      });
                    } else {
                      resolve({
                        totalNet: totalNet,
                        history: results,
                        bookingPartnerPaymentMethod: bookingPartnerPaymentMethod
                      });
                    }
                  });
                }
              });
            }
          });
        } else {
          reject("Invalid purchase identifier");
        }
      });
    } else {
      reject("Invalid purchase identifier");
    }
  });
};
/**
 * Updates charge
 * 
 * @param {Number} chargeId Charge identifier
 * @param {Object} data     Charge data
 * @param {Number} userId   User identifier
 * 
 * @returns {Promise}
 */


var updateCharge = function updateCharge(chargeId, data, userId) {
  return new Promise(function (resolve, reject) {
    if (parseInt(chargeId) > 0) {
      db.get().execute("UPDATE charge SET\n                addedToAccountingUpdatedBy = ".concat(userId, ", addedToAccountingUpdatedAt = NOW(), addedToAccounting = ").concat(data.addedToAccounting ? "TRUE" : "FALSE", "\n                WHERE chargeID = ").concat(parseInt(chargeId)), function (err, results) {
        if (err) {
          reject(err.message);
        } else {
          resolve();
        }
      });
    } else {
      reject("Invalid charge identifier");
    }
  });
};
/**
 * Changes Added status of all charges for the specific purchase
 * 
 * @param {Number} purchaseId Purchase identifier
 * @param {Object} data       Charge data
 * @param {Number} userId     User identifier
 * 
 * @returns {Promise}
 */


var updateChargesForPurchase = function updateChargesForPurchase(purchaseId, data, userId) {
  return new Promise(function (resolve, reject) {
    if (parseInt(purchaseId) > 0) {
      db.get().execute("SELECT * FROM charge WHERE purchaseId = ".concat(parseInt(purchaseId)), function (err, results) {
        if (err) {
          reject(err.message);
        } else {
          var promises = [];
          results.map(function (item) {
            promises.push(updateCharge(item.chargeID, data, userId));
          });
          Promise.all(promises).then(function () {
            resolve();
          })["catch"](function (error) {
            reject(error);
          });
        }
      });
    } else {
      reject("Invalid charge identifier");
    }
  });
};
/**
 * Deletes charge
 * 
 * @param {Number} chargeId Charge identifier
 * 
 * @returns {Promise}
 */


var deleteCharge = function deleteCharge(chargeId) {
  return new Promise(function (resolve, reject) {
    if (parseInt(chargeId) > 0) {
      db.get().execute("DELETE FROM charge WHERE chargeID = ".concat(parseInt(chargeId)), function (err, results) {
        if (err) {
          reject(err.message);
        } else {
          resolve();
        }
      });
    } else {
      reject("Invalid charge identifier");
    }
  });
};

module.exports = {
  payment: payment,
  refund: refund,
  history: history,
  deleteCharge: deleteCharge,
  updateChargesForPurchase: updateChargesForPurchase,
  updateCharge: updateCharge
};