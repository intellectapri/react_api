"use strict";

/**
 * Purchases
 */
var Joi = require('joi');

var utils = require('./../../shared/utils');

var miscDelete = require('./misc.delete');

var db = require('./../../shared/db');

var queryFormatters = require('./queryFormatters');

var _require = require('./vouchers'),
    getAll = _require.getAll,
    searchVoucherTours = _require.searchVoucherTours;

var _require2 = require('./regenerateBookingPartnerInvoices'),
    regenerateBookingPartnerInvoices = _require2.regenerateBookingPartnerInvoices;

var createSchema = Joi.object().keys({
  totalGross: Joi.any().required(),
  commission: Joi.any().required(),
  totalNet: Joi.any().required(),
  customerId: Joi.any().required(),
  travelerFirstname: Joi.string().allow(''),
  travelerLastname: Joi.string().allow(''),
  additionalNames: Joi.string().allow(''),
  email: Joi.string().allow(''),
  phone: Joi.string().allow(''),
  hotel: Joi.string().allow(''),
  country: Joi.string().allow(''),
  revenueAccNo: Joi.string().allow(''),
  invoice: Joi.string().allow(''),
  invoiceDate: Joi.string().regex(utils.DATE_CHECK_REGEXP),
  taxInc: Joi.string().allow(''),
  taxCode: Joi.string().allow(''),
  userId: Joi.string().required(),
  internalNotes: Joi.string().allow('')
}).unknown(true);
/**
 * Returns purchase with specific identifier
 * 
 * @param {Number} id Purchase identifier
 * 
 * @returns {Promise}
 */

var find = function find(id) {
  return new Promise(function (resolve, reject) {
    if (parseInt(id) > 0) {
      db.get().execute("SELECT * FROM purchase WHERE purchaseID = ".concat(id), function (err, results) {
        if (err) {
          reject(err);
        } else {
          if (results.length === 1) {
            resolve(results[0]);
          } else {
            resolve(false);
          }
        }
      });
    } else {
      reject("Invalid identifier");
    }
  });
};
/**
 * Returns all purchases
 * 
 * @returns {Promise}
 */


var findAll = function findAll() {
  return new Promise(function (resolve, reject) {
    if (id > 0) {
      db.get().execute("SELECT * FROM purchase WHERE", function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    } else {
      reject("Invalid identifier");
    }
  });
};
/**
 * Recalculates total purchase price
 * 
 * @param {Number} id Purchase identifier
 * 
 *  @returns {Promise}
 */


var recalculateTotal = function recalculateTotal(id) {
  return new Promise(function (resolve, reject) {
    if (id > 0) {
      var _sql = "SELECT\n                customer.commissionLevel, p.customerID, pt.totalGross, pt.commission, pt.totalNet\n                FROM purchase_tour pt\n                LEFT JOIN purchase p ON p.purchaseID = pt.purchaseID\n                LEFT JOIN customer ON customer.customerID = p.customerID\n                WHERE pt.purchaseID = ".concat(id);

      db.get().execute(_sql, function (err, results) {
        if (err) {
          reject(err);
          return;
        }

        if (results.length === 1) {
          var tourTotal = results.pop();
          var comissionLevel = tourTotal.commissionLevel ? parseFloat(tourTotal.commissionLevel) : 0;
          db.get().execute("SELECT SUM(price * qty) AS total FROM purchase_misc WHERE purchaseID = ".concat(id), function (err, results) {
            if (err) {
              reject(err);
            } else if (results.length !== 1) {
              reject("Unable to find misc purchase with identifier ".concat(id));
            } else {
              var miscTotal = results[0].total ? parseFloat(results[0].total) : 0;
              var miscTotalWithComission = miscTotal * (100 - comissionLevel) / 100;
              var overallGross = parseFloat(tourTotal['totalGross']) + parseFloat(miscTotal);
              var overallCommission = parseFloat(tourTotal['commission']);
              var overallNet = parseFloat(tourTotal['totalNet']) + parseFloat(miscTotalWithComission);
              if (process.env.DEBUG) console.log("Recalculating, overall gross ".concat(overallGross, ", commission ").concat(overallCommission, " and net ").concat(overallNet));
              _sql = "UPDATE purchase SET\n                                totalGross = ".concat(overallGross, ",\n                                commission = ").concat(overallCommission, ",\n                                totalNet = ").concat(overallNet, "\n                            WHERE purchaseID = ").concat(id);
              db.get().execute(_sql, function (err) {
                if (err) {
                  reject(err);
                  return;
                }

                resolve();
              });
            }
          });
        } else {
          reject("Unable to find purchase with identifier ".concat(id));
        }
      });
    } else {
      reject("Invalid identifier");
    }
  });
};
/**
 * Generates values population clauses
 * 
 * @param {Object} data Item details
 * 
 * @returns {String}
 */


var generatePopulateValuesClauses = function generatePopulateValuesClauses(data) {
  var valueClauses = [];
  if (data.customerId) valueClauses.push([" customerID = '".concat(utils.sanitize(data.customerId), "' ")]);
  if (data.travelerFirstname) valueClauses.push([" travelerFirstname = '".concat(utils.sanitize(data.travelerFirstname), "' ")]);
  if (data.travelerLastname) valueClauses.push([" travelerLastname = '".concat(utils.sanitize(data.travelerLastname), "' ")]);
  if (data.additionalNames) valueClauses.push([" additionalNames = '".concat(utils.sanitize(data.additionalNames), "' ")]);
  if (data.email) valueClauses.push([" email = '".concat(utils.sanitize(data.email), "' ")]);
  if (data.phone) valueClauses.push([" phone = '".concat(utils.sanitize(data.phone), "' ")]);
  if (data.hotel) valueClauses.push([" hotel = '".concat(utils.sanitize(data.hotel), "' ")]);
  if (data.country) valueClauses.push([" originCountry = '".concat(utils.sanitize(data.country), "' ")]);
  valueClauses.push([" totalGross = '".concat(utils.sanitize(data.totalGross), "' ")]);
  valueClauses.push([" commission = '".concat(data.commission ? utils.sanitize(data.commission) : 0, "' ")]);
  valueClauses.push([" totalNet = '".concat(utils.sanitize(data.totalNet), "' ")]);
  if (data.revenueAccNo) valueClauses.push([" revenueAccNo = '".concat(utils.sanitize(data.revenueAccNo), "' ")]);
  if (data.invoice) valueClauses.push([" invoice = '".concat(utils.sanitize(data.invoice), "' ")]);
  if (data.invoiceDate) valueClauses.push([" invoiceDate = '".concat(utils.sanitize(data.invoiceDate), "' ")]);
  if (data.taxInc) valueClauses.push([" taxInc = '".concat(utils.sanitize(data.taxInc), "' ")]);
  if (data.taxCode) valueClauses.push([" taxCode = '".concat(utils.sanitize(data.taxCode), "' ")]);
  if (data.internalNotes) valueClauses.push([" internalNotes = '".concat(utils.sanitize(data.internalNotes), "' ")]);
  var valueClausesSQL = "";

  if (valueClauses.length > 0) {
    valueClausesSQL = ", " + valueClauses.join(" , ");
  }

  return valueClausesSQL;
};
/**
 * Returns purchase
 * 
 * @param {String} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */


var getPurchase = function getPurchase(purchaseId) {
  return new Promise(function (resolve, reject) {
    var result = false;
    getMiscPurchase(purchaseId).then(function (miscPurchase) {
      if (miscPurchase.tourPurchase === false) {
        result = miscPurchase;
        result.purchaseType = 'misc';
        resolve(result);
      } else {
        getTourPurchase(purchaseId).then(function (purchase) {
          result = purchase;
          result.purchaseType = 'tour';
          resolve(result);
        })["catch"](reject);
      }
    })["catch"](reject);
  });
};
/**
 * Returns tour purchase
 * 
 * @param {String} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */


var getTourPurchase = function getTourPurchase(purchaseId) {
  return new Promise(function (resolve, reject) {
    if (parseInt(purchaseId) > 0) {
      var _sql2 = "SELECT t.detailID as detailId, t.productID as productId, p.purchaseID as purchaseId, p.customerID as customerId,\n                p.*, t.*, t.totalGross as totalGross, t.totalNet as totalNet,\n                cust.name, cust.myob, cust.commissionLevel, cust.contactFirstname, cust.contactLastname, cust.contactEmail, cust.emailConfirmation,\n                cust.reservationConfirmEmail, cust.paymentViaInvoice, cust.paymentDueTerm, cust.layout, cust.printedForm, cust.archived, cust.paymentMethod,\n                cust.customerNotes\n                FROM purchase p\n                INNER JOIN (\n                    SELECT *\n                    FROM purchase_tour pt\n                    WHERE true\n                ) t ON t.purchaseID = p.purchaseID\n                LEFT JOIN customer cust ON cust.customerID = p.customerID\n                LEFT JOIN user u ON u.userID = p.enteredBy\n                LEFT JOIN product prod ON prod.productID = t.productID\n                WHERE p.purchaseID = ".concat(purchaseId);

      db.get().execute(_sql2, function (err, results) {
        if (err) {
          reject(err);
        } else if (results.length === 1) {
          db.get().execute("SELECT * FROM charge WHERE purchaseID = ".concat(purchaseId, " AND addedToAccounting = TRUE"), function (err, accountedCharges) {
            if (err) {
              reject(err);
            } else {
              var locked = accountedCharges.length > 0;
              db.get().execute("SELECT * FROM purchase_misc WHERE purchaseID = ".concat(purchaseId), function (err, miscPurchases) {
                if (err) {
                  reject(err);
                } else {
                  var miscPurchasesTotal = 0;

                  if (miscPurchases) {
                    miscPurchases.map(function (item) {
                      if (item.price && item.qty) {
                        miscPurchasesTotal = miscPurchasesTotal + parseFloat(item.price) * parseFloat(item.qty);
                      }
                    });
                  }

                  var data = results[0];
                  data.miscPurchases = {
                    total: miscPurchasesTotal,
                    items: miscPurchases
                  };
                  db.get().execute("SELECT * FROM product WHERE productID = ".concat(data.productID), function (err, product) {
                    if (err) {
                      reject(err);
                    }

                    data.product = product[0];
                    data.locked = locked;
                    resolve(data);
                  });
                }
              });
            }
          });
        } else {
          resolve(false);
        }
      });
    } else {
      reject("Invalid tour purchase identifier ".concat(purchaseId));
    }
  });
};
/**
 * Returns misc purchase
 * 
 * @param {String} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */


var getMiscPurchase = function getMiscPurchase(purchaseId) {
  return new Promise(function (resolve, reject) {
    if (parseInt(purchaseId) > 0) {
      var _sql3 = "SELECT prod.productID as productId, p.purchaseID as purchaseId, p.customerID as customerId, p.*,\n                t.detailID as detailId, t.*, cust.name AS customerName, u.firstname, u.lastname\n                FROM purchase p\n                LEFT JOIN (\n                    SELECT detailID, purchaseID, '' AS status, productID, purchaseType, GROUP_CONCAT(name SEPARATOR ', ') AS productName\n                    FROM (\n                        SELECT pm.detailID, pm.purchaseID, pm.productID, 'misc' AS purchaseType, CONCAT( prod.name,' (', SUM(qty) ,')') AS name\n                        FROM purchase_misc pm\n                        INNER JOIN product prod ON prod.productID = pm.productID\n                        GROUP BY pm.purchaseID, pm.productID\n                    ) AS misc\n                    GROUP BY purchaseID\n                ) t ON t.purchaseID = p.purchaseID\n                LEFT JOIN customer cust ON cust.customerID = p.customerID\n                LEFT JOIN user u ON u.userID = p.enteredBy\n                LEFT JOIN product prod ON prod.productID = t.productID\n                WHERE p.purchaseID = ".concat(purchaseId);

      db.get().execute(_sql3, function (err, results) {
        if (err) {
          reject(err);
        } else if (results.length === 1) {
          var purchase = results[0];
          db.get().execute("SELECT * FROM purchase_misc WHERE purchaseID = ".concat(purchaseId), function (err, results) {
            if (err) {
              reject(err);
            } else {
              db.get().execute("SELECT * FROM charge WHERE purchaseID = ".concat(purchaseId, " AND addedToAccounting = TRUE"), function (err, accountedCharges) {
                if (err) {
                  reject(err);
                } else {
                  var locked = accountedCharges.length > 0; // Check if there is a corresponding tour purchase

                  db.get().execute("SELECT * FROM purchase_tour WHERE purchaseID = ".concat(purchaseId), function (err, tourPurchaseResults) {
                    if (err) {
                      reject(err);
                    } else {
                      purchase.products = results;
                      purchase.products.map(function (item, index) {
                        purchase.products[index].productId = purchase.products[index].productID;
                        if (item.qty) purchase.products[index].qty = parseFloat(purchase.products[index].qty);
                        if (item.price) purchase.products[index].price = parseFloat(purchase.products[index].price);
                      });
                      purchase.tourPurchase = false;

                      if (tourPurchaseResults.length === 1) {
                        purchase.tourPurchase = tourPurchaseResults[0];
                      }

                      purchase.locked = locked;
                      resolve(purchase);
                    }
                  });
                }
              });
            }
          });
        } else {
          resolve(false);
        }
      });
    } else {
      reject("Invalid misc purchase identifier ".concat(purchaseId));
    }
  });
};
/**
 * Creates purchase
 * 
 * @param {Object} data   Purchase information
 * @param {Number} userId User identifier
 * 
 * @returns {Promise}
 */


var create = function create(data, userId) {
  return new Promise(function (resolve, reject) {
    if (!userId) {
      reject("Unable to detect the user identifier");
      return;
    }

    Joi.validate(data, createSchema).then(function () {
      var valueClausesSQL = generatePopulateValuesClauses(data);
      var sql = "INSERT INTO purchase SET enteredBy = ".concat(userId, ", enteredAt = NOW(), purchaseDate = ").concat(data.purchaseDate ? "'".concat(data.purchaseDate, "'") : "NOW()", " ").concat(valueClausesSQL);
      db.get().execute(sql, function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results.insertId);
        }
      });
    })["catch"](function (error) {
      reject(error);
    });
  });
};
/**
 * Deletes misc purchase
 * 
 * @param {String} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */


var deleteMiscPurchase = function deleteMiscPurchase(purchaseId, userId) {
  return new Promise(function (resolve, reject) {
    if (!purchaseId) {
      reject("Unable to detect the purchase identifier");
      return;
    }

    purchaseId = parseInt(purchaseId); // Checking if the misc purchase is the standalone one

    db.get().execute("SELECT * FROM purchase_tour WHERE purchaseID = ".concat(purchaseId), function (err, checkResults) {
      if (err) {
        reject(err);
        return;
      } // Making sure that no payments left


      db.get().execute("SELECT * FROM charge WHERE purchaseID = ".concat(purchaseId), function (err, results) {
        if (err) {
          reject(err);
          return;
        }

        if (results.length !== 0) {
          reject('Unable to delete misc purchase with payments left');
          return;
        }

        if (checkResults.length === 0) {
          db.get().execute("DELETE FROM purchase WHERE purchaseID = ".concat(purchaseId), function (err, results) {
            if (err) {
              reject(err);
              return;
            }

            db.get().execute("DELETE FROM purchase_misc WHERE purchaseID = ".concat(purchaseId), function (err, results) {
              if (err) {
                reject(err);
                return;
              }

              resolve({
                status: 'success'
              });
            });
          });
        } else {
          find(purchaseId).then(function (purchase) {
            miscDelete.deleteAllMiscPurchasesForPurchase(purchaseId).then(function () {
              recalculateTotal(purchaseId).then(function () {
                if (true && purchase.customerID !== 211) {
                  regenerateBookingPartnerInvoices(purchaseId, purchase.customerID, userId, false).then(function () {
                    resolve({
                      status: 'success'
                    });
                  })["catch"](reject);
                } else {
                  resolve({
                    status: 'success'
                  });
                }
              })["catch"](reject);
            })["catch"](reject);
          })["catch"](reject);
        }
      });
    });
  });
};
/**
 * Updates purchase
 * 
 * @param {Object} data   Purchase information
 * @param {Number} userId User identifier
 * 
 * @returns {Promise}
 */


var update = function update(data, userId) {
  return new Promise(function (resolve, reject) {
    if (!data.purchaseId) {
      reject("Unable to detect the purchase identifier");
      return;
    }

    if (!userId) {
      reject("Unable to detect the user identifier");
      return;
    }

    var valueClausesSQL = generatePopulateValuesClauses(data);
    var purchaseDateUpdate = ", purchaseDate = ".concat(data.purchaseDate ? "'" + data.purchaseDate + "'" : "NOW()");

    if (data.noPurchaseDate) {
      purchaseDateUpdate = "";
    }

    var sql = "UPDATE purchase SET updatedBy = ".concat(userId, ", updatedAt = NOW() ").concat(purchaseDateUpdate, " ").concat(valueClausesSQL, " WHERE purchaseID = ").concat(data.purchaseId);
    db.get().execute(sql, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
};
/**
 * Calculates total number of found records
 * 
 * @param {Array} data Filters
 * 
 * @returns {Integer}
 */


var searchTotal = function searchTotal(data, _ref) {
  var additionalJoinQuery = _ref.additionalJoinQuery,
      additionalWhereQuery = _ref.additionalWhereQuery;
  return new Promise(function (resolve, reject) {
    var searchSQL = queryFormatters.getSearchSQL(data);
    var mainSearchSQL = queryFormatters.getMainSearchSQL(data);
    var purchaseTypeTour = "";

    if (data.purchaseTour || !data.purchaseMisc || parseInt(data.purchaseMisc) === 0) {
      purchaseTypeTour = " OR t.purchaseType = 'tour' ";
    }

    var purchaseTypeMisc = "";

    if (data.purchaseMisc || !data.purchaseTour || parseInt(data.purchaseTour) === 0) {
      purchaseTypeMisc = " OR t.purchaseType = 'misc' ";
    }

    sql = "SELECT COUNT(*) as total FROM (\n            SELECT ppp.* FROM (\n                SELECT p.purchaseID\n                FROM purchase p\n                INNER JOIN (".concat(searchSQL, ") t ON t.purchaseID = p.purchaseID\t\t\t\t\t\t\n                LEFT JOIN customer cust ON cust.customerID = p.customerID\n                LEFT JOIN user u ON u.userID = p.enteredBy\n                WHERE true AND (t.purchaseType = 'tourmisc' ").concat(purchaseTypeTour, " ").concat(purchaseTypeMisc, ") ").concat(mainSearchSQL, "\n                GROUP BY p.purchaseID\n            ) AS ppp\n            ").concat(additionalJoinQuery, "\n            ").concat(additionalWhereQuery, "\n        ) as totalSet");
    db.get().execute(sql, function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results.pop().total);
      }
    });
  });
};
/**
 * Searches in purchases according to provided filters
 * 
 * @param {Object} data Filters
 * 
 * @returns {Promise}
 */


var search = function search(data) {
  return new Promise(function (resolve, reject) {
    var _utils$getPaginationS = utils.getPaginationSettings(data),
        selectLimit = _utils$getPaginationS.selectLimit,
        selectOffset = _utils$getPaginationS.selectOffset,
        selectOrder = _utils$getPaginationS.selectOrder;

    var allowedOrderByColumns = ["status", "bookingID", "tourdate", "lastname", "product", "totalguest", "outstanding", "customer", "children", "adult", "family", "addition", "sale", "enteredby", "purchasedate", "noOfAdult", "noOfChildren", "noOfFamilyGroups", "noOfAdditionals", "totalNet", "purchaseDate", "customerName", "tourDate", "travelerLastname", "productName", "purchaseID", "voucherIDs"];
    var selectSortByClause = " ORDER BY tourDate ".concat(selectOrder, " ");
    var sortBy = "tourDate";

    if ("sortBy" in data && data.sortBy && allowedOrderByColumns.indexOf(data.sortBy) > -1) {
      sortBy = data.sortBy;
      if (data.sortBy === "purchaseID") data.sortBy = "purchaseID";
      if (data.sortBy === "tourdate") data.sortBy = "tourDate";
      if (data.sortBy === "lastname") data.sortBy = "travelerLastname";
      if (data.sortBy === "product") data.sortBy = "productName";
      if (data.sortBy === "customer") data.sortBy = "customerName";
      if (data.sortBy === "adult") data.sortBy = "noOfAdult";
      if (data.sortBy === "children") data.sortBy = "noOfChildren";
      if (data.sortBy === "family") data.sortBy = "noOfFamilyGroups";
      if (data.sortBy === "addition") data.sortBy = "noOfAdditionals";
      if (data.sortBy === "sale") data.sortBy = "totalNet";
      if (data.sortBy === "enteredby") data.sortBy = "totalNet";
      if (data.sortBy === "purchasedate") data.sortBy = "purchaseDate"; //if (data.sortBy === `voucherCode`) data.sortBy = `voucherCode`;

      if (data.sortBy === "voucherIDs") data.sortBy = "voucherIDs";
      selectSortByClause = " ORDER BY ".concat(data.sortBy, " ").concat(selectOrder, " ");
      if (data.sortBy === "enteredby") selectSortByClause = " ORDER BY firstname ".concat(selectOrder, ", lastname ").concat(selectOrder, " ");
    }

    var outerSortBy = "";
    if (data.sortBy === "totalGuest") outerSortBy = " ORDER BY totalGuest ".concat(selectOrder, " ");
    var selectLimitOffsetClause = " ".concat(selectSortByClause, " LIMIT ").concat(selectLimit, " OFFSET ").concat(selectOffset);
    var selectSearchSQL = queryFormatters.getSearchSQL(data);
    var selectPrimarySearchSQL = queryFormatters.getSearchSQL(data);
    var whereClauseSQL = queryFormatters.getMainSearchSQL(data);
    var purchaseTypeTour = "";

    if (data.purchaseTour || !data.purchaseMisc || parseInt(data.purchaseMisc) === 0) {
      purchaseTypeTour = " OR t.purchaseType = 'tour' ";
    }

    var purchaseTypeMisc = "";

    if (data.purchaseMisc || !data.purchaseTour || parseInt(data.purchaseTour) === 0) {
      purchaseTypeMisc = " OR t.purchaseType = 'misc' ";
    }

    var additionalJoinQuery = "";
    var additionalJoinQueries = [];
    var additionalWhereQuery = "";
    var additionalWhereQueries = [];
    if (data.famils) additionalWhereQueries.push(" extra_search.famils = 1 ");
    if (data.family) additionalWhereQueries.push(" extra_search.family = 1 ");
    if (data.bookingRefId) additionalWhereQueries.push(" extra_search.bookingRefID LIKE '%".concat(data.bookingRefId, "%' "));
    if (data.travelagency) additionalWhereQueries.push(" extra_search.travelAgency LIKE '%".concat(data.travelagency, "%' ")); // if( data.voucherIDs) {
    //     additionalWhereQueries.push(` extra_search.voucherIDs LIKE '%${data.voucherIDs}%' `);
    // }

    if (additionalWhereQueries.length > 0) {
      additionalJoinQueries.push(" INNER JOIN purchase_tour extra_search ON extra_search.purchaseID = ppp.purchaseID ");
    }

    if (data.travelerName) {
      additionalJoinQueries.push(" INNER JOIN purchase extra_search_p ON extra_search_p.purchaseID = ppp.purchaseID ");
      additionalWhereQueries.push(" extra_search_p.travelerLastname LIKE '%".concat(data.travelerName, "%' "));
    }

    if (additionalWhereQueries.length > 0) {
      additionalJoinQuery = additionalJoinQueries.join(" ");
      additionalWhereQuery = " WHERE ".concat(additionalWhereQueries.join(" AND "));
    }

    var sql = "SELECT *, (totalNet - IF(totalPaid IS NULL, 0, totalPaid)) as outstanding\n        FROM (\n            SELECT p.*, IF(family = 0, noOfAdult + noOfChildren, noOfFamilyGroups * 4 + noOfAdditionals + noOfAddChildren) as totalGuest,\n                SUM(IF(c.type = 'payment',c.amount,c.amount*-1)) as totalPaid\n            FROM (\n                SELECT ppp.* FROM (\n                    SELECT\n                        p.purchaseID, p.purchaseDate, p.travelerLastname,  p.totalNet, p.myobImport,\n                        t.detailID, tt.status, tt.tourDate, tt.noOfAdult, tt.noOfChildren, tt.noOfFamilyGroups, tt.noOfAdditionals, tt.noOfAddChildren, tt.family,\n                        GROUP_CONCAT(DISTINCT t.name ORDER BY t.purchaseType DESC SEPARATOR ', ') AS productName,\n                        GROUP_CONCAT(DISTINCT t.purchaseType ORDER BY t.purchaseType DESC SEPARATOR '') AS purchaseType,\n                        cust.name AS customerName,\n                        p.enteredBy, p.enteredAt, p.updatedBy, p.updatedAt\n                    FROM purchase p\n                    INNER JOIN (".concat(selectSearchSQL, ") t ON t.purchaseID = p.purchaseID\n                    INNER JOIN (").concat(selectPrimarySearchSQL, ") tt ON tt.purchaseID = p.purchaseID\n                    LEFT JOIN customer cust ON cust.customerID = p.customerID\n                    WHERE true AND (t.purchaseType = 'tourmisc' ").concat(purchaseTypeTour, " ").concat(purchaseTypeMisc, ") ").concat(whereClauseSQL, "\n                    GROUP BY p.purchaseID\n                ) AS ppp \n\n                ").concat(additionalJoinQuery, "\n                ").concat(additionalWhereQuery, "\n                ").concat(selectLimitOffsetClause, "\n            ) AS p\n            LEFT JOIN charge c ON c.purchaseID = p.purchaseID\n            GROUP BY p.purchaseID\n            ").concat(outerSortBy, "\n        ) AS t\n        WHERE t.purchaseType = 'tourmisc' ").concat(purchaseTypeTour, " ").concat(purchaseTypeMisc, " ").concat(selectSortByClause);
    db.get().execute(sql, function (err, results) {
      if (err) {
        reject(err);
      } else {
        searchTotal(data, {
          additionalJoinQuery: additionalJoinQuery,
          additionalWhereQuery: additionalWhereQuery
        }).then(function (totalNumber) {
          resolve({
            total: totalNumber,
            offset: selectOffset,
            limit: selectLimit,
            order: selectOrder,
            orderBy: sortBy,
            data: results
          });
        });
      }
    });
  });
};
/**
 * Checks if specified date is booked for specific product
 * 
 * @param {Number} productId Checked product identifier
 * @param {String} date      Checked date
 * 
 * @returns {Promise}
 */


var isBookedDate = function isBookedDate(productId, date) {
  return new Promise(function (resolve, reject) {
    if (productId && date) {
      productId = utils.sanitize(productId);
      date = utils.sanitize(date);
      db.get().execute("SELECT * FROM purchase_tour WHERE status = 'active'\n                AND DATE_FORMAT(tourDate,'%Y-%m-%d') = '".concat(date, "' AND productID = ").concat(productId), function (err, results) {
        if (err) {
          reject(err);
        } else {
          if (results.length > 0) {
            resolve({
              isBooked: true
            });
          } else {
            resolve({
              isBooked: false
            });
          }
        }
      });
    } else {
      reject("Invalid parameters were provided");
    }
  });
};
/**
 * Searches for all purchases of the specific customer
 * 
 * @param {Number} id     Customer identifier
 * @param {Object} parmss Selection parameters
 */


var findAllByCustomerId = function findAllByCustomerId(id, params) {
  return new Promise(function (resolve, reject) {
    if (parseInt(id) > 0) {
      var _utils$getPaginationS2 = utils.getPaginationSettings(params),
          selectLimit = _utils$getPaginationS2.selectLimit,
          selectOffset = _utils$getPaginationS2.selectOffset;

      var detailsSQL = "SELECT pt.detailID, pt.purchaseID, pt.status, pt.productID, 'tour' AS purchaseType,\n                pt.tourDate, pt.noOfAdult, pt.noOfChildren, pt.noOfFamilyGroups, pt.noOfAddChildren, pt.noOfAdditionals,\n                pt.family, prod.name AS name\n                FROM purchase_tour pt\n                INNER JOIN product prod ON prod.productID = pt.productID\n                UNION \n                SELECT detailID, purchaseID, '' AS status, productID, purchaseType, '' AS tourDate, '' AS noOfAdult, '' AS noOfChildren,\n                    '' AS noOfFamilyGroups, '' AS noOfAddChildren, '' AS noOfAdditionals, '' AS family, GROUP_CONCAT(name SEPARATOR ', ') AS name\n                FROM (\n                    SELECT pm.detailID, pm.purchaseID, pm.productID, 'misc' AS purchaseType, CONCAT( prod.name,' (', SUM(qty) ,')') AS name\n                    FROM purchase_misc pm\n                    INNER JOIN product prod ON prod.productID = pm.productID\n                    GROUP BY pm.purchaseID, pm.productID\n                ) AS misc\n                GROUP BY purchaseID";

      var _sql4 = "SELECT *, IF(family = 0, noOfAdult + noOfChildren, noOfFamilyGroups * 4 + noOfAdditionals + noOfAddChildren) as totalGuest, (totalNet - IF(totalPaid IS NULL,0,totalPaid)) as outstanding\n            FROM(\n                    SELECT p.purchaseID, p.purchaseDate, p.travelerFirstname, p.travelerLastname,  p.totalNet,\n                    t.detailID, t.status, t.tourDate, t.noOfAdult, t.noOfChildren, t.noOfFamilyGroups, t.noOfAdditionals, t.noOfAddChildren, t.family,\n                    GROUP_CONCAT(DISTINCT t.name ORDER BY t.purchaseType DESC SEPARATOR ' ') AS productName,\n                    GROUP_CONCAT(DISTINCT t.purchaseType ORDER BY t.purchaseType DESC SEPARATOR '') AS purchaseType,\n                    SUM(IF(c.type = 'payment',c.amount,c.amount*-1)) as totalPaid,\n                    cust.name AS customerName,\n                    u.firstname, u.lastname\n                    FROM purchase p\n                    INNER JOIN (".concat(detailsSQL, ") t ON t.purchaseID = p.purchaseID\n                    LEFT JOIN charge c ON c.purchaseID = p.purchaseID\n                    LEFT JOIN customer cust ON cust.customerID = p.customerID\n                    LEFT JOIN user u ON u.userID = p.enteredBy\n                    WHERE p.customerID = ").concat(id, "\n                    GROUP BY p.purchaseID\n            ) AS t\n            GROUP BY purchaseDate LIMIT ").concat(selectLimit, " OFFSET ").concat(selectOffset);

      db.get().execute(_sql4, function (err, results) {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    } else {
      reject(utils.errors.NOT_FOUND);
    }
  });
};

module.exports = {
  find: find,
  findAll: findAll,
  create: create,
  update: update,
  deleteMiscPurchase: deleteMiscPurchase,
  getPurchase: getPurchase,
  search: search,
  recalculateTotal: recalculateTotal,
  isBookedDate: isBookedDate,
  getTourPurchase: getTourPurchase,
  getMiscPurchase: getMiscPurchase,
  findAllByCustomerId: findAllByCustomerId,
  getAll: getAll,
  searchVoucherTours: searchVoucherTours
};