"use strict";

/**
 * Sending tour confirmation
 */
var moment = require('moment');

var Email = require('./../Email');

var utils = require('./../../shared/utils');

var chargesBalance = require('./../charges/balance');

var db = require('./../../shared/db');

var products = require('./../products');

var _require = require('./tour.find'),
    find = _require.find,
    findOverallPurchase = _require.findOverallPurchase;
/**
 * Returns the tour time
 * 
 * @param {Object} purchase Purchase object
 * 
 * @returns {Promise}
 */


var getTourTime = function getTourTime(purchase) {
  return new Promise(function (resolve, reject) {
    if (purchase.prod_tourTime) {
      resolve(purchase.prod_tourTime);
    } else if (purchase.overrideTourTime) {
      resolve(moment(purchase.overrideTourTime, "HH:mm:ss").format("h:mm a"));
    } else {
      products.getTourTime(purchase.productId, moment(purchase.tourDate).format("YYYY-MM-DD")).then(resolve)["catch"](reject);
    }
  });
};
/**
 * Sends confirmation upon tour purchase
 * 
 * @param {String} texttype  Text type
 * @param {Number} detaildId Purchased tour identifier
 * @param {Number} userId    Author identifier
 * @param {String} email     Optional email
 * 
 * @returns {Promise}
 */


var sendConfirmation = function sendConfirmation(texttype, detaildId, userId, email) {
  var voucherCodes = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [];
  return new Promise(function (resolve, reject) {
    if (detaildId > 0 && userId > 0) {
      find(detaildId).then(function (purchase) {
        if (purchase) {
          findOverallPurchase(purchase.purchaseID).then(function (overallPurchase) {
            db.get().execute("SELECT * FROM purchase_misc pm\n                            LEFT JOIN product prod ON prod.productID = pm.productID\n                            WHERE purchaseID = ".concat(purchase.purchaseID), function (err, miscPurchases) {
              if (err) {
                reject(err);
              } else {
                getTourTime(purchase).then(function (tourTime) {
                  var totalAdults,
                      totalChildrens,
                      totalGuests,
                      totalFamilies = 0,
                      totalAdditional = 0;
                  var numberOfBabies = purchase.noOfBabies && parseInt(purchase.noOfBabies) > 0 ? parseInt(purchase.noOfBabies) : 0;

                  if (purchase.family === 1) {
                    totalFamilies = parseInt(purchase['noOfFamilyGroups']);
                    totalAdditional = parseInt(purchase['noOfAdditionals']);
                    totalAdults = parseInt(purchase['noOfFamilyGroups'] * 2 + parseInt(purchase['noOfAdditionals']));
                    totalChildrens = parseInt(purchase['noOfFamilyGroups'] * 2 + parseInt(purchase['noOfAddChildren']));
                    totalGuests = totalAdults + totalChildrens;
                  } else {
                    totalGuests = purchase['noOfAdult'] + purchase['noOfChildren'] + numberOfBabies;
                    totalAdults = purchase['noOfAdult'];
                    totalChildrens = purchase['noOfChildren'];
                  }

                  chargesBalance.balance(purchase.purchaseId).then(function (amountPaid) {
                    amountOutstanding = utils.dollarFormat(purchase['totalNet'] - amountPaid);
                    amountPaid = utils.dollarFormat(amountPaid);
                    var emailInstance = new Email(purchase.templateCode);
                    emailInstance.setTexttype(texttype);

                    if (texttype === "standard" || texttype === "voucher") {
                      emailInstance.addTo(purchase["email"], purchase["travelerFirstname"] + " " + purchase["travelerLastname"]);
                    } else if (texttype === "customer") {
                      emailInstance.addTo(email ? email : purchase["partnerEmail"], purchase["customerName"]);
                    } else {
                      emailInstance.addTo(purchase["operatorEmail"], "Operator");
                    }

                    if (texttype === 'standard' && voucherCodes && purchase.voucherIDs) {
                      emailInstance.addVariable('{VOUCHER CODES}', voucherCodes.join(', '));
                    }

                    emailInstance.addVariable('{TOUR_DATE}', moment(purchase['tourDate']).format("dddd, DD-MMM-YYYY"));
                    emailInstance.addVariable('{TOUR_TIME}', tourTime);
                    emailInstance.addVariable('{TOUR_TYPE}', purchase['productName']);
                    emailInstance.addVariable('{TOUR_LANGUAGE}', purchase['language']);
                    emailInstance.addVariable('{LEAD_TRAVELLER_LAST_NAME}', purchase['travelerLastname']);
                    emailInstance.addVariable('{NUMBER_OF_ADULTS}', totalAdults, true);
                    emailInstance.addVariable('{NUMBER_OF_CHILDREN}', totalChildrens, true);
                    emailInstance.addVariable('{NUMBER_OF_FAMILIES}', totalFamilies, true);
                    emailInstance.addVariable('{ADDITIONAL_RIDERS}', totalAdditional, true);
                    emailInstance.addVariable('{TOTAL_GUESTS}', totalGuests);
                    emailInstance.addVariable('{BOOKING_ID}', purchase['purchaseID']);
                    emailInstance.addVariable('{AMOUNT_PAID}', amountPaid);
                    emailInstance.addVariable('{AMOUNT_OUTSTANDING}', amountOutstanding);
                    emailInstance.addVariable('{GUEST_NOTES}', purchase['guestNote'] ? purchase['guestNote'] : '');
                    emailInstance.addVariable('{BOOKING_REF_ID}', purchase['bookingRefID']);
                    emailInstance.addVariable('{BOOKING_STATUS}', purchase['status'].charAt(0).toUpperCase() + purchase['status'].slice(1));
                    emailInstance.addVariable('{VOUCHER_PURCHASER_LAST_NAME}', purchase['voucherLastname']);
                    emailInstance.addVariable('{NUMBER_OF_INFANTS}', purchase.noOfBabies, true);
                    var miscPruchasesString = false;

                    if (miscPurchases && miscPurchases.length > 0) {
                      miscPruchasesString = [];
                      miscPurchases.map(function (item) {
                        miscPruchasesString.push("".concat(item.name, " (").concat(item.qty, ")"));
                      });
                      miscPruchasesString = miscPruchasesString.join(", ");
                    }

                    emailInstance.addVariable('{LIST_MISCELLANEOUS_PURCHASES}', miscPruchasesString, true);
                    var equipmentList = [];
                    if (purchase.babySeats && parseInt(purchase.babySeats) > 0) equipmentList.push("Baby seats (".concat(purchase.babySeats, ")"));
                    if (purchase.trailAlongs && parseInt(purchase.trailAlongs) > 0) equipmentList.push("Trail alongs (".concat(purchase.trailAlongs, ")"));
                    if (purchase.smallKidsBikes && parseInt(purchase.smallKidsBikes) > 0) equipmentList.push("Small kids bikes (".concat(purchase.smallKidsBikes, ")"));
                    if (purchase.largeKidsBikes && parseInt(purchase.largeKidsBikes) > 0) equipmentList.push("Large kids bikes (".concat(purchase.largeKidsBikes, ")"));
                    emailInstance.addVariable('{LIST_EQUIPMENT}', equipmentList.length > 0 ? equipmentList.join(", ") : false, true);
                    emailInstance.addVariable('{NETT_SALE_AMOUNT}', overallPurchase.totalNet ? '$' + overallPurchase.totalNet : false, true);
                    emailInstance.send().then(function () {
                      emailInstance.save(userId, detaildId).then(resolve)["catch"](reject);
                    })["catch"](reject);
                  })["catch"](reject);
                })["catch"](reject);
              }
            });
          })["catch"](reject);
        } else {
          reject("Unable to find tour purchase with identifier ".concat(detaildId));
        }
      })["catch"](reject);
    } else {
      reject("Invalid tour purchase identifier or user identifier");
    }
  });
};

module.exports = sendConfirmation;