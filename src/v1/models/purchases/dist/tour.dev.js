"use strict";

/**
 * Tour purchases
 */
var Joi = require('joi');

var utils = require('./../../shared/utils');

var db = require('./../../shared/db');

var purchases = require('./index');

var bookingPartners = require('./../bookingPartners');

var chargesRegenerate = require('./../charges/regenerate');

var sendConfirmation = require('./sendConfirmation');

var _require = require('./misc.delete'),
    deleteAllMiscPurchasesForPurchase = _require.deleteAllMiscPurchasesForPurchase;

var voucher = require('../discount');

var products = require("../products");

var discounts = require("../discount");
/**
 * Generates values population clauses
 * 
 * @param {Object} data Item details
 */


var generatePopulateValuesClauses = function generatePopulateValuesClauses(data) {
  var insertValuesClauses = [];
  insertValuesClauses.push(" status = '".concat(utils.sanitize(data["status"]), "' "));

  if (data.status === "cancelled") {
    insertValuesClauses.push(" cancelledDate = NOW() ");
  }

  if (parseInt(data['optionTourTime']) === 1) {
    insertValuesClauses.push(" overrideTourTime = '".concat(data["overrideTourTime"], "' "));
  } else {
    insertValuesClauses.push(" overrideTourTime = NULL ");
  }

  ["noOfAdult", "noOfChildren", "noOfBabies", "noOfFamilyGroups", "noOfAdditionals", "noOfAddChildren"].map(function (item) {
    if (data[item] && parseInt(data[item]) > 0) {
      insertValuesClauses.push(" ".concat(item, " = ").concat(parseInt(data[item]), " "));
    } else {
      insertValuesClauses.push(" ".concat(item, " = 0 "));
    }
  });
  ["adultPrice", "childPrice", "familyRate", "additionalRate"].map(function (item) {
    if (data[item] && parseFloat(data[item]) > 0) {
      insertValuesClauses.push(" ".concat(item, " = ").concat(parseFloat(data[item]), " "));
    } else {
      insertValuesClauses.push(" ".concat(item, " = 0 "));
    }
  });
  insertValuesClauses.push(" purchaseID = '".concat(data.purchaseId, "' "));
  insertValuesClauses.push(" productID = ".concat(utils.sanitize(data["productId"]), " "));
  insertValuesClauses.push(" voucher = '".concat(utils.sanitize(data["voucher"]), "' "));
  if (data["voucherLastname"]) insertValuesClauses.push(" voucherLastname = '".concat(utils.sanitize(data["voucherLastname"]), "' "));
  if (data["voucherFirstname"]) insertValuesClauses.push(" voucherFirstname = '".concat(utils.sanitize(data["voucherFirstname"]), "' "));
  insertValuesClauses.push(" originCountry = '".concat(utils.sanitize(data["originCountry"]), "' "));
  insertValuesClauses.push(" tourDate = '".concat(utils.sanitize(data["tourDate"]), "' "));
  insertValuesClauses.push(" family = ".concat(utils.sanitize(data["family"]), " "));

  if (data["checkIn"] && parseInt(data["checkIn"]) === 1) {
    insertValuesClauses.push(" checkIn = 1 ");
    insertValuesClauses.push(" checkInInitial = TRUE ");
  } else {
    insertValuesClauses.push(" checkIn = 0 ");
    insertValuesClauses.push(" checkInInitial = FALSE ");
  }

  if (data["noShow"] && parseInt(data["noShow"]) === 1) {
    insertValuesClauses.push(" noShow = 1 ");
    insertValuesClauses.push(" noShowInitial = TRUE ");
  } else {
    insertValuesClauses.push(" noShow = 0 ");
    insertValuesClauses.push(" noShowInitial = FALSE ");
  }

  insertValuesClauses.push(" confirmedByPartner = ".concat(utils.sanitize(data["confirmedByPartner"]), " "));
  insertValuesClauses.push(" language = '".concat(utils.sanitize(data["language"]), "' "));
  if (data["ccNo"]) insertValuesClauses.push(" ccNo = '".concat(utils.sanitize(data["ccNo"]), "' "));
  insertValuesClauses.push(" bookingRefID = '".concat(utils.sanitize(data["bookingRefID"]), "' "));
  if (data["travelAgency"]) insertValuesClauses.push(" travelAgency = '".concat(utils.sanitize(data["travelAgency"]), "' "));
  insertValuesClauses.push(" bookingSource = '".concat(utils.sanitize(data["bookingSource"]), "' "));
  if (data["guestNote"]) insertValuesClauses.push(" guestNote = '".concat(utils.sanitize(data["guestNote"]), "' "));
  if (data["sendToGuest"]) insertValuesClauses.push(" sendToGuest = ".concat(utils.sanitize(data["sendToGuest"]), " "));
  if (data["sendToPartner"]) insertValuesClauses.push(" sendToPartner = ".concat(utils.sanitize(data["sendToPartner"]), " "));
  if (data["sendToPartner"] && data["partnerEmail"]) insertValuesClauses.push(" partnerEmail = '".concat(utils.sanitize(data["partnerEmail"]), "' "));
  if (data["sendToTourOperator"]) insertValuesClauses.push(" sendToTourOperator = ".concat(utils.sanitize(data["sendToTourOperator"]), " "));
  if (data["operatorEmail"]) insertValuesClauses.push(" operatorEmail = '".concat(utils.sanitize(data["operatorEmail"]), "' "));
  if (data["twoDayRule"]) insertValuesClauses.push(" twoDayRule = ".concat(utils.sanitize(data["twoDayRule"]), " "));
  insertValuesClauses.push(" totalGross = '".concat(utils.sanitize(data["totalGross"]), "' "));

  if (data["commission"] && parseInt(data["commission"]) > 0) {
    insertValuesClauses.push(" commission = ".concat(utils.sanitize(data["commission"]), " "));
  } else {
    insertValuesClauses.push(" commission = 0 ");
  }

  insertValuesClauses.push(" totalNet = '".concat(utils.sanitize(data["totalNet"]), "' "));

  if (data["famils"] && parseInt(data["famils"]) > 0) {
    insertValuesClauses.push(" famils = ".concat(utils.sanitize(data["famils"]), " "));
  } else {
    insertValuesClauses.push(" famils = 0 ");
  }

  ["babySeats", "trailAlongs", "smallKidsBikes", "largeKidsBikes", "advTourSale"].map(function (item) {
    if (data[item]) {
      insertValuesClauses.push(" ".concat(item, " = ").concat(utils.sanitize(data[item]), " "));
    }
  });
  var discounted = data.discounted ? 1 : 0;
  insertValuesClauses.push(" voucherCode = '".concat(utils.sanitize(data['voucherCode']), "'"));
  insertValuesClauses.push(" discounted = '".concat(discounted, "'"));
  return insertValuesClauses;
};
/**
 * Creates tour purchase
 * 
 * @param {Object} data   Tour purchase information
 * @param {Number} userId Author identifier
 * 
 * @returns {Promise}
 */


var create = function create(data, userId) {
  return new Promise(function (resolve, reject) {
    purchases.create(data, userId).then(function (purchaseId) {
      data.purchaseId = purchaseId;
      insertValuesClauses = generatePopulateValuesClauses(data);
      var sql = "INSERT INTO purchase_tour SET ".concat(insertValuesClauses.join(" , "));
      db.get().execute(sql, function (err, result) {
        if (err) {
          reject(err);
        } else {
          var detailId = result.insertId;
          var customerId = data.customerId ? parseInt(data.customerId) : 0;
          var confirmationsPromises = [];
          var tourUpdatedPromise = Promise.resolve([]);

          if (data.sendToGuest && parseInt(data.sendToGuest) === 1) {
            if (!data.email) {
              reject("Unable to get email for sending confirmation to guest");
            } else {
              if (data.voucher && parseInt(data.voucher) === 1) {
                confirmationsPromises.push(sendConfirmation('voucher', detailId, userId));
              } else {
                tourUpdatedPromise = new Promise(function (resolve, reject) {
                  products.get(data.productId).then(function (product) {
                    if (product.typeCode === "VOUCHERS") {
                      var codes = discounts.generateCode(data.noOfAdult);
                      var valuePerCode = data.adultPrice;
                      var voucherPromises = codes.map(function (code) {
                        return discounts.create({
                          discountCode: code,
                          expireDate: "2050-01-01",
                          oneTimeUse: 1,
                          active: 1,
                          discountAmount: valuePerCode,
                          discountType: "ABSOLUTE",
                          useCount: 0
                        });
                      });
                      Promise.all(voucherPromises).then(function (results) {
                        var ids = results.map(function (result) {
                          return result.insertId;
                        });
                        var sql = "UPDATE purchase_tour SET voucherIDs ='".concat(utils.sanitize(ids.join(',')), "' WHERE detailID ='").concat(detailId, "'");
                        db.get().execute(sql, function (err, results) {
                          if (err) {
                            reject(err);
                          }

                          confirmationsPromises.push(sendConfirmation('standard', detailId, userId, null, codes));
                          resolve(results);
                        });
                      });
                    } else {
                      confirmationsPromises.push(sendConfirmation('standard', detailId, userId));
                      resolve([]);
                    }
                  })["catch"](function (err) {
                    reject(err);
                  });
                });
              }
            }
          }

          if (data.sendToPartner && parseInt(data.sendToPartner) === 1) {
            if (!data.partnerEmail) {
              reject("Unable to get email for sending confirmation to partner");
            } else {
              confirmationsPromises.push(sendConfirmation('customer', detailId, userId));
            }
          }

          if (data.sendToTourOperator && parseInt(data.sendToTourOperator) === 1) {
            if (!data.operatorEmail) {
              reject("Unable to get email for sending confirmation to tour operator");
            } else {
              confirmationsPromises.push(sendConfirmation('tourOperator', detailId, userId));
            }
          }

          bookingPartners.getInvoiceOption(customerId).then(function (invoiceOption) {
            var invoicePromises = [];

            if (customerId > 0) {
              if (invoiceOption) {
                invoicePromises.push(chargesRegenerate.regenerateInvoices(data.purchaseId, userId));
              }
            }

            var additionalActionsPromises = confirmationsPromises.concat(invoicePromises);
            additionalActionsPromises.push(tourUpdatedPromise);
            Promise.all(additionalActionsPromises).then(function () {
              resolve({
                purchaseId: purchaseId,
                detailId: detailId,
                confirmationSent: confirmationsPromises.length,
                invoicesGenerated: invoicePromises.length
              });
            })["catch"](reject);
          });
        }
      });
    })["catch"](reject);
  });
};
/**
 * Updates status and nullifies amounts
 * 
 * @param {Number} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */


var setPurchaseAsCancelled = function setPurchaseAsCancelled(purchaseId) {
  return new Promise(function (resolve, reject) {
    db.get().execute("UPDATE purchase SET totalGross = 0, commission = 0, totalNet = 0 WHERE purchaseID = ".concat(purchaseId), function (err) {
      if (err) {
        reject(err.message);
        return;
      }

      db.get().execute("UPDATE purchase_tour SET totalGross = 0, commission = 0, totalNet = 0, status = 'cancelled' WHERE purchaseID = ".concat(purchaseId), function (err) {
        if (err) {
          reject(err.message);
          return;
        } // @todo Send the cancel booking confirmation


        console.error("Booking cancelling confirmation was not sent");
        resolve();
      });
    });
  });
};
/**
 * Updates status
 * 
 * @param {Number} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */


var setPurchaseAsRefunded = function setPurchaseAsRefunded(purchaseId) {
  return new Promise(function (resolve, reject) {
    db.get().execute("UPDATE purchase_tour SET status = 'refunded' WHERE purchaseID = ".concat(purchaseId), function (err) {
      if (err) {
        reject(err.message);
        return;
      }

      resolve();
    });
  });
};
/**
 * Updates tour purchase
 * 
 * @param {Object} data   Tour purchase information
 * @param {Number} userId Author identifier
 * 
 * @returns {Promise}
 */


var update = function update(data, userId) {
  return new Promise(function (resolve, reject) {
    db.get().execute("SELECT * FROM purchase_tour WHERE purchaseID = ".concat(data.purchaseId), function (err, results) {
      if (err) {
        reject(err);
        return;
      }

      if (results.length !== 1) {
        reject("Tour purchase with identifier ".concat(data.purchaseId, " was not found"));
      } else {
        var oldStatus = results[0].status;
        var newStatus = data.status ? data.status : "active";
        var bookingWasCancelled = false;

        if (newStatus === "cancelled" && oldStatus !== newStatus) {
          bookingWasCancelled = true;
        }

        if (newStatus === "deleted" && oldStatus !== newStatus) {
          bookingWasCancelled = true;
        }

        data.noPurchaseDate = true;
        purchases.update(data, userId).then(function () {
          insertValuesClauses = generatePopulateValuesClauses(data);
          db.get().execute("UPDATE purchase_tour SET ".concat(insertValuesClauses.join(" , "), " WHERE detailID = ").concat(data.detailId), function (err, results) {
            if (err) {
              reject(err);
              return;
            }

            var detailId = parseInt(data.detailId);
            var purchaseId = parseInt(data.purchaseId);
            var customerId = data.customerId ? parseInt(data.customerId) : 0;

            var finishPurchaseUpdate = function finishPurchaseUpdate() {
              purchases.recalculateTotal(purchaseId).then(function () {
                bookingPartners.getInvoiceOption(customerId).then(function (invoiceOption) {
                  var confirmationsPromises = [];

                  if (data.sendToGuest && parseInt(data.sendToGuest) === 1) {
                    if (data.voucher && parseInt(data.voucher) === 1) {
                      confirmationsPromises.push(sendConfirmation('voucher', detailId, userId));
                    } else {
                      confirmationsPromises.push(sendConfirmation('standard', detailId, userId));
                    }
                  }

                  if (data.sendToPartner && parseInt(data.sendToPartner) === 1) {
                    confirmationsPromises.push(sendConfirmation('customer', detailId, userId));
                  }

                  if (data.sendToTourOperator && parseInt(data.sendToTourOperator) === 1) {
                    confirmationsPromises.push(sendConfirmation('tourOperator', detailId, userId));
                  }

                  var invoicePromises = [];

                  if (customerId > 0) {
                    if (invoiceOption) {
                      invoicePromises.push(chargesRegenerate.regenerateInvoices(purchaseId, userId));
                    }
                  }

                  var additionalActionsPromises = confirmationsPromises.concat(invoicePromises);
                  Promise.all(additionalActionsPromises).then(function () {
                    resolve(results);
                  })["catch"](function (errors) {
                    console.error(errors);
                    reject(errors);
                  });
                })["catch"](reject);
              })["catch"](reject);
            };

            if (bookingWasCancelled) {
              deleteAllMiscPurchasesForPurchase(purchaseId);
              setPurchaseAsCancelled(purchaseId).then(finishPurchaseUpdate)["catch"](reject);

              if (!!data['voucherIDs']) {
                data['voucherIDs'].split(',').map(function (id) {
                  if (id) {
                    voucher.get(id).then(function (discount) {
                      discount.active = 0;
                      delete discount.createdAt;
                      delete discount.createdBy;
                      voucher.update(id, {
                        discountAmount: discount.discountAmount,
                        discountCode: discount.discountCode,
                        expireDate: discount.expireDate,
                        oneTimeUse: discount.isOneTimeUse,
                        discountType: discount.discountType,
                        active: 0,
                        useCount: discount.useCount
                      });
                    })["catch"](function (err) {
                      console.log("Couldn't get discount: ".concat(JSON.stringify(err)));
                    });
                  }
                });
              }
            } else {
              finishPurchaseUpdate();
            }
          });
        });
      }
    });
  });
};

var setCheckIn = function setCheckIn(id, newValue) {
  return new Promise(function (resolve, reject) {
    if (parseInt(id) > 0 && [0, 1].indexOf(newValue) > -1) {
      var sql = "UPDATE purchase_tour SET checkIn = ".concat(newValue, " WHERE detailID = ").concat(id);
      db.get().execute(sql, function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      reject("Invalid data was provided");
    }
  });
};

var setNoShow = function setNoShow(id, newValue) {
  return new Promise(function (resolve, reject) {
    if (parseInt(id) > 0 && [0, 1].indexOf(newValue) > -1) {
      var sql = "UPDATE purchase_tour SET noShow = ".concat(newValue, " WHERE detailID = ").concat(id);
      db.get().execute(sql, function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      reject("Invalid data was provided");
    }
  });
};
/**
 * Performs financial analysis
 * 
 * @param {String} data Analysis options
 * 
 * @returns {Promise}
 */


var financialAnalysis = function financialAnalysis(data) {
  return new Promise(function (resolve, reject) {
    var schema = Joi.object().keys({
      productId: Joi.number().integer(),
      status: Joi.string(),
      famils: Joi.string(),
      travelagency: Joi.string(),
      from: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
      to: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
      bookingPartnerId: Joi.number().integer()
    });
    Joi.validate(data, schema).then(function () {
      var whereClauses = [];
      if (data.productId) whereClauses.push(" pt.productID = ".concat(utils.sanitize(data.productId), " "));
      if (data.status) whereClauses.push(" pt.status = '".concat(utils.sanitize(data.status), "' "));
      if (data.famils) whereClauses.push(" pt.famils = ".concat(utils.sanitize(data.famils), " "));
      if (data.travelagency) whereClauses.push(" pt.travelAgency LIKE '%".concat(utils.sanitize(data.travelagency), "%' "));
      if (data.bookingPartnerId) whereClauses.push(" p.customerID = ".concat(utils.sanitize(data.bookingPartnerId), " "));
      whereClauses.push(" DATE_FORMAT(pt.tourDate, '%Y-%m-%d') >= '".concat(data.from, "' "));
      whereClauses.push(" DATE_FORMAT(pt.tourDate, '%Y-%m-%d') <= '".concat(data.to, "' "));
      var sql = "SELECT prod.name AS productName, \n            p.travelerFirstname, p.travelerLastname, p.totalGross, p.purchaseDate, p.purchaseID, p.myobImport, pt.tourDate,\n                pt.noOfAdult, pt.adultPrice, p.email,\n                pt.noOfChildren, pt.childPrice,\n                pt.noOfFamilyGroups, pt.familyRate,\n                pt.noOfAddAdult, pt.additionalRate,\n                pt.noOfAddChildren, pt.additionalRate,\n                pt.status, pt.bookingRefID, pt.bookingSource, pt.travelAgency, pt.originCountry, pt.famils,\n                c.name AS customerName,\n                CONCAT(u.firstname,' ',u.lastname) AS staffName\n                FROM purchase_tour pt\n                INNER JOIN purchase p ON p.purchaseID = pt.purchaseID\n                INNER JOIN product prod ON prod.productID = pt.productID\n                LEFT JOIN customer c ON c.customerID = p.customerID\n                LEFT JOIN user u ON u.userID = p.enteredBy\n                WHERE true AND ".concat(whereClauses.join(" AND "), " GROUP BY p.purchaseID");
      db.get().execute(sql, function (err, results) {
        if (err) {
          reject(err.message);
        } else {
          var promises = [];
          results.map(function (item) {
            promises.push(new Promise(function (localResolve, localReqect) {
              db.get().execute("SELECT purchaseID, SUM(addedToAccounting = TRUE) as added, COUNT(*) as total FROM charge WHERE purchaseID = ".concat(item.purchaseID, " GROUP BY purchaseID"), function (err, localResults) {
                if (err) {
                  localReqect(err.message);
                } else {
                  localResults.map(function (localItem) {
                    results.map(function (item, index) {
                      if (item.purchaseID === localItem.purchaseID) {
                        results[index].chargesAdded = localItem.added ? parseInt(localItem.added) : 0;
                        results[index].chargesTotal = localItem.total ? parseInt(localItem.total) : 0;
                      }
                    });
                  });
                  localResolve();
                }
              });
            }));
          });
          Promise.all(promises).then(function () {
            resolve(results);
          })["catch"](function (error) {
            reject(error);
          });
        }
      });
    })["catch"](function (error) {
      reject(error);
    });
  });
};
/**
 * Finds all booking for specific date
 * 
 * @param {String} date Searched date
 * 
 * @returns {Promise}
 */


var findFutureBookingByDate = function findFutureBookingByDate(date) {
  return new Promise(function (resolve, reject) {
    var schema = Joi.object().keys({
      date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required()
    });
    Joi.validate({
      date: date
    }, schema).then(function () {
      var sql = "SELECT prod.name AS productName, pt.tourDate, pt.purchaseID,\n                SUM(IF(pt.family = 0, pt.noOfAdult + pt.noOfChildren, pt.noOfFamilyGroups * 4 + pt.noOfAdditionals + noOfAddChildren)) AS totalGuest,\n                a.total AS totalAllotment\n                FROM purchase_tour pt\n                INNER JOIN product prod ON prod.productID = pt.productID\n                INNER JOIN allotment a ON a.productID = pt.productID AND a.allotmentDate = pt.tourDate\n                WHERE DATE_FORMAT(pt.tourDate,'%Y-%m-%d') = '".concat(date, "' AND pt.status = 'active' GROUP BY prod.productID");
      db.get().execute(sql, function (err, results) {
        if (err) {
          reject(err.message);
        } else {
          var productQueries = [];
          results.map(function (item) {
            productQueries.push(new Promise(function (resolve, reject) {
              db.get().execute("SELECT pm.purchaseID, pm.qty, pm.productID, prod.name\n                                FROM purchase_misc pm\n                                INNER JOIN product prod ON prod.productID = pm.productID\n                                WHERE purchaseID = ".concat(item.purchaseID, " AND prod.includeInUpcomingTourReport IS TRUE"), function (err, results) {
                if (err) {
                  reject(err.message);
                } else {
                  resolve(results);
                }
              });
            }));
          });
          Promise.all(productQueries).then(function (productResults) {
            productResults.map(function (item) {
              item.map(function (subItem) {
                results.map(function (tourItem, tourIndex) {
                  if (tourItem.purchaseID === subItem.purchaseID) {
                    if (!results[tourIndex].products) results[tourIndex].products = [];
                    results[tourIndex].products.push(subItem);
                  }
                });
              });
            });
            resolve(results);
          })["catch"](function (error) {
            reject(error);
          });
        }
      });
    })["catch"](function (error) {
      reject(error);
    });
  });
};
/**
 * Finds future booking
 * 
 * @param {String} date Searched date
 * 
 * @returns {Promise}
 */


var findFutureBooking = function findFutureBooking(date) {
  return new Promise(function (resolve, reject) {
    var schema = Joi.object().keys({
      date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required()
    });
    Joi.validate({
      date: date
    }, schema).then(function () {
      var sql = "SELECT pt.*, \n                p.travelerLastname, p.phone, p.hotel, p.additionalNames, p.internalNotes,\n                prod.name AS productName,\n                SUM(IF(c.type = 'payment',c.amount,-1*c.amount)) AS totalPaid,\n                cust.myob\n            FROM purchase_tour pt\n            INNER JOIN purchase p ON p.purchaseID = pt.purchaseID\n            INNER JOIN product prod ON prod.productID = pt.productID\n            LEFT JOIN customer cust ON cust.customerID = p.customerID\n            LEFT JOIN charge c ON c.purchaseID = pt.purchaseID\n            WHERE DATE_FORMAT(pt.tourDate,'%Y-%m-%d') > '".concat(date, "'\n            AND DATE_FORMAT(pt.tourDate,'%Y-%m-%d') <=  DATE_ADD('").concat(date, "',INTERVAL 2 WEEK)\n            AND pt.status = 'active'\n            GROUP BY p.purchaseID");
      db.get().execute(sql, function (err, results) {
        if (err) {
          reject(err.message);
        } else {
          resolve(results);
        }
      });
    })["catch"](function (error) {
      reject(error);
    });
  });
};

module.exports = {
  create: create,
  setPurchaseAsCancelled: setPurchaseAsCancelled,
  setPurchaseAsRefunded: setPurchaseAsRefunded,
  update: update,
  setCheckIn: setCheckIn,
  setNoShow: setNoShow,
  findFutureBookingByDate: findFutureBookingByDate,
  findFutureBooking: findFutureBooking,
  financialAnalysis: financialAnalysis
};