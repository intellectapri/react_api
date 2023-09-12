/**
 * Tour purchases
 */

const Joi = require('joi');
const moment = require('moment');
const utils = require('./../../shared/utils');
const db = require('./../../shared/db');

const purchases = require('./index');
const bookingPartners = require('./../bookingPartners');
const chargesRegenerate = require('./../charges/regenerate');
const sendConfirmation = require('./sendConfirmation');
const { deleteAllMiscPurchasesForPurchase } = require('./misc.delete');
const voucher = require('../discount');
const products = require("../products");
const discounts = require("../discount");

/**
 * Generates values population clauses
 *
 * @param {Object} data Item details
 */
const generatePopulateValuesClauses = (data) => {
    let insertValuesClauses = [];
    insertValuesClauses.push(` status = '${utils.sanitize(data[`status`])}' `);
    if (data.status === `cancelled`) {
        insertValuesClauses.push(` cancelledDate = NOW() `);
    }

    if (parseInt(data['optionTourTime']) === 1) {
        insertValuesClauses.push(` overrideTourTime = '${data[`overrideTourTime`]}' `);
    } else {
        insertValuesClauses.push(` overrideTourTime = NULL `);
    }

    [`noOfAdult`, `noOfChildren`, `noOfBabies`, `noOfFamilyGroups`,
        `noOfAdditionals`, `noOfAddChildren`].map(item => {
        if (data[item] && parseInt(data[item]) > 0) {
            insertValuesClauses.push(` ${item} = ${parseInt(data[item])} `);
        } else {
            insertValuesClauses.push(` ${item} = 0 `);
        }
    });

    [`adultPrice`, `childPrice`, `familyRate`, `additionalRate`].map(item => {
        if (data[item] && parseFloat(data[item]) > 0) {
            insertValuesClauses.push(` ${item} = ${parseFloat(data[item])} `);
        } else {
            insertValuesClauses.push(` ${item} = 0 `);
        }
    });

    insertValuesClauses.push(` purchaseID = '${data.purchaseId}' `);
    insertValuesClauses.push(` productID = ${utils.sanitize(data[`productId`])} `);
    insertValuesClauses.push(` voucher = '${utils.sanitize(data[`voucher`])}' `);
    if (data[`voucherLastname`]) insertValuesClauses.push(` voucherLastname = '${utils.sanitize(data[`voucherLastname`])}' `);
    if (data[`voucherFirstname`]) insertValuesClauses.push(` voucherFirstname = '${utils.sanitize(data[`voucherFirstname`])}' `);
    insertValuesClauses.push(` originCountry = '${utils.sanitize(data[`originCountry`])}' `);
    insertValuesClauses.push(` tourDate = '${utils.sanitize(data[`tourDate`])}' `);
    insertValuesClauses.push(` family = ${utils.sanitize(data[`family`])} `);

    if (data[`checkIn`] && parseInt(data[`checkIn`]) === 1) {
        insertValuesClauses.push(` checkIn = 1 `);
        insertValuesClauses.push(` checkInInitial = TRUE `);
    } else {
        insertValuesClauses.push(` checkIn = 0 `);
        insertValuesClauses.push(` checkInInitial = FALSE `);
    }

    if (data[`noShow`] && parseInt(data[`noShow`]) === 1) {
        insertValuesClauses.push(` noShow = 1 `);
        insertValuesClauses.push(` noShowInitial = TRUE `);
    } else {
        insertValuesClauses.push(` noShow = 0 `);
        insertValuesClauses.push(` noShowInitial = FALSE `);
    }

    insertValuesClauses.push(` confirmedByPartner = ${utils.sanitize(data[`confirmedByPartner`])} `);
    insertValuesClauses.push(` language = '${utils.sanitize(data[`language`])}' `);
    if (data[`ccNo`]) insertValuesClauses.push(` ccNo = '${utils.sanitize(data[`ccNo`])}' `);
    insertValuesClauses.push(` bookingRefID = '${utils.sanitize(data[`bookingRefID`])}' `);
    if (data[`travelAgency`]) insertValuesClauses.push(` travelAgency = '${utils.sanitize(data[`travelAgency`])}' `);
    insertValuesClauses.push(` bookingSource = '${utils.sanitize(data[`bookingSource`])}' `);
    if (data[`guestNote`]) insertValuesClauses.push(` guestNote = '${utils.sanitize(data[`guestNote`])}' `);
    if (data[`sendToGuest`]) insertValuesClauses.push(` sendToGuest = ${utils.sanitize(data[`sendToGuest`])} `);
    if (data[`sendToPartner`]) insertValuesClauses.push(` sendToPartner = ${utils.sanitize(data[`sendToPartner`])} `);
    if (data[`sendToPartner`] && data[`partnerEmail`]) insertValuesClauses.push(` partnerEmail = '${utils.sanitize(data[`partnerEmail`])}' `);
    if (data[`sendToTourOperator`]) insertValuesClauses.push(` sendToTourOperator = ${utils.sanitize(data[`sendToTourOperator`])} `);
    if (data[`operatorEmail`]) insertValuesClauses.push(` operatorEmail = '${utils.sanitize(data[`operatorEmail`])}' `);
    if (data[`twoDayRule`]) insertValuesClauses.push(` twoDayRule = ${utils.sanitize(data[`twoDayRule`])} `);
    insertValuesClauses.push(` totalGross = '${utils.sanitize(data[`totalGross`])}' `);
    if (data[`commission`] && parseInt(data[`commission`]) > 0) {
        insertValuesClauses.push(` commission = ${utils.sanitize(data[`commission`])} `);
    } else {
        insertValuesClauses.push(` commission = 0 `);
    }

    insertValuesClauses.push(` totalNet = '${utils.sanitize(data[`totalNet`])}' `);
    if (data[`famils`] && parseInt(data[`famils`]) > 0) {
        insertValuesClauses.push(` famils = ${utils.sanitize(data[`famils`])} `);
    } else {
        insertValuesClauses.push(` famils = 0 `);
    }

    [`babySeats`, `trailAlongs`, `smallKidsBikes`, `largeKidsBikes`, `advTourSale`].map(item => {
        if (data[item]) {
            insertValuesClauses.push(` ${item} = ${utils.sanitize(data[item])} `);
        }
    });

    const discounted = data.discounted ? 1 : 0;
    insertValuesClauses.push( ` voucherCode = '${utils.sanitize(data['voucherCode'])}'`);
    insertValuesClauses.push( ` discounted = '${discounted}'`);

    return insertValuesClauses;
};

const getKeyByValue = (object, value) => {
  return Object.keys(object).find(key => object[key] === value);
}

/**
 * Creates tour purchase
 *
 * @param {Object} data   Tour purchase information
 * @param {Number} userId Author identifier
 *
 * @returns {Promise}
 */
const create = (data, userId) => {
    return new Promise((resolve, reject) => {
        // Check Count Tour by Product ID
        let sqltour = `SELECT p.productID, p.cutOff, p.minGuestNo,
        p.availabilityMon, p.availabilityTue, p.availabilityWed, p.availabilityThu,
        p.availabilityFri, p.availabilitySat, p.availabilitySun,
        COALESCE(COUNT(pt.productID),0) as tot_tour,
        COALESCE(SUM(pt.noOfAdult + pt.noOfChildren),0) as tot_guest
        FROM product AS p
        LEFT JOIN
          (
              SELECT productID,noOfAdult,noOfChildren
              FROM purchase_tour
              WHERE tourDate = '${data.tourDate}'
              GROUP BY noOfAdult,noOfChildren
          ) AS pt ON p.productID = pt.productID
        WHERE p.productID = ${data.productId}
        GROUP BY p.productID, p.cutOff, p.minGuestNo,
        p.availabilityMon, p.availabilityTue, p.availabilityWed, p.availabilityThu,
        p.availabilityFri, p.availabilitySat, p.availabilitySun`;
        // resolve(sqltour);
          db.get().execute(sqltour, (err, results) => {
            if (err) { reject(err); return; }
            if (results.length !== 1) {
                reject(`Product Tour with identifier ${data.productId} was not found`);
            } else {
              var prods = results[0];
              let DAYS_OF_WEEK = { availabilitySun: 'Sunday', availabilityMon: 'Monday', availabilityTue: 'Tuesday', availabilityWed: 'Wednesday', availabilityThu: 'Thursday', availabilityFri: 'Friday', availabilitySat: 'Saturday' };
              let curdate = moment(data.tourDate).format('dddd');
              var getDay = getKeyByValue(DAYS_OF_WEEK,curdate);
              let nowTime = moment();
              // let cutOff20h = moment(data.tourDate).subtract(20, 'h');
              let cutOff2day = moment(data.tourDate).subtract(prods.cutOff, 'days');
              // Cutoff
              if(prods.cutOff > 0){
                if (prods.tot_tour == 0) {
                  if (nowTime.isSameOrAfter(cutOff2day)) {
                    resolve({messageValidation: `Oops, you have to book before ${cutOff2day.format('LLLL')}` });
                  }
                }
              }

              // min pax
              let curpax = parseInt(prods.tot_guest) + parseInt(data.totalRiders);
              let minpax = prods.minGuestNo - curpax;
              if (prods.minGuestNo > 0 && curpax < prods.minGuestNo  ) {
                resolve({messageValidation: `Oops, oops, you have to add ${minpax} more guests, because there are a minimum of ${prods.minGuestNo} guests on this tour` });
              }

              // insert purchase tour
              // resolve(`insert`);
              purchases.create(data, userId).then(purchaseId => {
                  data.purchaseId = purchaseId;
                  insertValuesClauses = generatePopulateValuesClauses(data);
                  let sql = `INSERT INTO purchase_tour SET ${insertValuesClauses.join(` , `)}`;

                  db.get().execute(sql, (err, result) => {
                      if (err) {
                          reject(err);
                      } else {
                          let detailId = result.insertId;
                          let customerId = (data.customerId ? parseInt(data.customerId) : 0);

                          let confirmationsPromises = [];
                          let tourUpdatedPromise = Promise.resolve([]);
                          if (data.sendToGuest && parseInt(data.sendToGuest) === 1) {
                              if (!data.email) {
                                  reject(`Unable to get email for sending confirmation to guest`);
                              } else {
                                  if (data.voucher && parseInt(data.voucher) === 1) {
                                      confirmationsPromises.push(sendConfirmation('voucher', detailId, userId));
                                  } else {
                                      tourUpdatedPromise = new Promise( (resolve, reject) => {
                                          products.get(data.productId).then( product => {

                                              if( product.typeCode === "VOUCHERS" ){
                                                  const codes = discounts.generateCode(data.noOfAdult);
                                                  const valuePerCode = data.adultPrice;
                                                  const voucherPromises = codes.map( code => {
                                                      return discounts.create({
                                                          discountCode: code,
                                                          expireDate: "2050-01-01",
                                                          oneTimeUse: 1,
                                                          active: 1,
                                                          discountAmount: valuePerCode,
                                                          discountType: "ABSOLUTE",
                                                          useCount: 0
                                                      });
                                                  })

                                                  Promise.all(voucherPromises).then( results => {
                                                      const ids = results.map( result => result.insertId)
                                                      const sql = `UPDATE purchase_tour SET voucherIDs ='${utils.sanitize(ids.join(','))}' WHERE detailID ='${detailId}'`;
                                                      db.get().execute(sql, (err, results) =>{
                                                          if( err ){
                                                              reject(err)
                                                          }
                                                          confirmationsPromises.push(sendConfirmation('standard', detailId, userId, null, codes))
                                                          resolve(results)
                                                      })
                                                  })
                                              }else{
                                                  confirmationsPromises.push(sendConfirmation('standard', detailId, userId));
                                                  resolve([]);
                                              }
                                          }).catch( err => {

                                              reject(err)
                                          })
                                      } );

                                  }
                              }
                          }

                          if (data.sendToPartner && parseInt(data.sendToPartner) === 1) {
                              if (!data.partnerEmail) {
                                  reject(`Unable to get email for sending confirmation to partner`);
                              } else {
                                  confirmationsPromises.push(sendConfirmation('customer', detailId, userId));
                              }
                          }

                          if (data.sendToTourOperator && parseInt(data.sendToTourOperator) === 1) {
                              if (!data.operatorEmail) {
                                  reject(`Unable to get email for sending confirmation to tour operator`);
                              } else {
                                  confirmationsPromises.push(sendConfirmation('tourOperator', detailId, userId));
                              }
                          }



                          bookingPartners.getInvoiceOption(customerId).then(invoiceOption => {
                              let invoicePromises = [];
                              if (customerId > 0) {
                                  if (invoiceOption) {
                                      invoicePromises.push(chargesRegenerate.regenerateInvoices(data.purchaseId, userId));
                                  }
                              }

                              let additionalActionsPromises = confirmationsPromises.concat(invoicePromises);
                                  additionalActionsPromises.push(tourUpdatedPromise);
                              Promise.all(additionalActionsPromises).then(() => {
                                  resolve({
                                      purchaseId: purchaseId,
                                      detailId: detailId,
                                      confirmationSent: confirmationsPromises.length,
                                      invoicesGenerated: invoicePromises.length
                                  });
                              }).catch(reject);
                          });
                      }
                  });
              }).catch(reject);


            }

          });



    });
};

/**
 * Updates status and nullifies amounts
 *
 * @param {Number} purchaseId Purchase identifier
 *
 * @returns {Promise}
 */
const setPurchaseAsCancelled = (purchaseId) => {
    return new Promise((resolve, reject) => {
        db.get().execute(`UPDATE purchase SET totalGross = 0, commission = 0, totalNet = 0 WHERE purchaseID = ${purchaseId}`, (err) => {
            if (err) { reject(err.message); return }

            db.get().execute(`UPDATE purchase_tour SET totalGross = 0, commission = 0, totalNet = 0, status = 'cancelled' WHERE purchaseID = ${purchaseId}`, (err) => {
                if (err) { reject(err.message); return }

                // @todo Send the cancel booking confirmation
                console.error(`Booking cancelling confirmation was not sent`);

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
const setPurchaseAsRefunded = (purchaseId) => {
    return new Promise((resolve, reject) => {
        db.get().execute(`UPDATE purchase_tour SET status = 'refunded' WHERE purchaseID = ${purchaseId}`, (err) => {
            if (err) { reject(err.message); return }

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
const update = (data, userId) => {
    return new Promise((resolve, reject) => {
        db.get().execute(`SELECT * FROM purchase_tour WHERE purchaseID = ${data.purchaseId}`, (err, results) => {
            if (err) { reject(err); return; }
            if (results.length !== 1) {
                reject(`Tour purchase with identifier ${data.purchaseId} was not found`);
            } else {
                let oldStatus = results[0].status;
                let newStatus = (data.status ? data.status : `active`);

                let bookingWasCancelled = false;
                if (newStatus === `cancelled` && oldStatus !== newStatus) {
                    bookingWasCancelled = true;
                }
                if (newStatus === `deleted` && oldStatus !== newStatus) {
                    bookingWasCancelled = true;
                }
                data.noPurchaseDate = true;
                purchases.update(data, userId).then(() => {
                    insertValuesClauses = generatePopulateValuesClauses(data);

                    db.get().execute(`UPDATE purchase_tour SET ${insertValuesClauses.join(` , `)} WHERE detailID = ${data.detailId}`, (err, results) => {
                        if (err) { reject(err); return; }

                        let detailId = parseInt(data.detailId);
                        let purchaseId = parseInt(data.purchaseId);
                        let customerId = (data.customerId ? parseInt(data.customerId) : 0);

                        const finishPurchaseUpdate = () => {
                            purchases.recalculateTotal(purchaseId).then(() => {
                                bookingPartners.getInvoiceOption(customerId).then(invoiceOption => {
                                    let confirmationsPromises = [];
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

                                    let invoicePromises = [];
                                    if (customerId > 0) {
                                        if (invoiceOption) {
                                            invoicePromises.push(chargesRegenerate.regenerateInvoices(purchaseId, userId));
                                        }
                                    }

                                    let additionalActionsPromises = confirmationsPromises.concat(invoicePromises);
                                    Promise.all(additionalActionsPromises).then(() => {
                                        resolve(results);
                                    }).catch(errors => {
                                        console.error(errors);
                                        reject(errors);
                                    });
                                }).catch(reject);
                            }).catch(reject);
                        };

                        if (bookingWasCancelled) {
                            deleteAllMiscPurchasesForPurchase(purchaseId);
                            setPurchaseAsCancelled(purchaseId).then(finishPurchaseUpdate).catch(reject);

                            if( !!data['voucherIDs'] ){

                                data['voucherIDs'].split(',').map( id => {
                                    if( id ){
                                        voucher.get(id).then( discount => {
                                            discount.active = 0;
                                            delete discount.createdAt;
                                            delete discount.createdBy;
                                            voucher.update( id, {
                                                discountAmount: discount.discountAmount,
                                                discountCode: discount.discountCode,
                                                expireDate: discount.expireDate,
                                                oneTimeUse: discount.isOneTimeUse,
                                                discountType: discount.discountType,
                                                active: 0,
                                                useCount: discount.useCount
                                            } );
                                        }).catch( err => {
                                            console.log( `Couldn't get discount: ${JSON.stringify(err)}`);
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

const setCheckIn = (id, newValue) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0 && [0, 1].indexOf(newValue) > -1) {
            let sql = `UPDATE purchase_tour SET checkIn = ${newValue} WHERE detailID = ${id}`;
            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } else {
            reject(`Invalid data was provided`);
        }
    });
};

const setNoShow = (id, newValue) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0 && [0, 1].indexOf(newValue) > -1) {
            let sql = `UPDATE purchase_tour SET noShow = ${newValue} WHERE detailID = ${id}`;
            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } else {
            reject(`Invalid data was provided`);
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
const financialAnalysis = (data) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer(),
            status: Joi.string(),
            famils: Joi.string(),
            travelagency: Joi.string(),
            from: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            to: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            bookingPartnerId: Joi.number().integer(),
        });

        Joi.validate(data, schema).then(() => {
            let whereClauses = [];
            if (data.productId) whereClauses.push(` pt.productID = ${utils.sanitize(data.productId)} `);
            if (data.status) whereClauses.push(` pt.status = '${utils.sanitize(data.status)}' `);
            if (data.famils) whereClauses.push(` pt.famils = ${utils.sanitize(data.famils)} `);
            if (data.travelagency) whereClauses.push(` pt.travelAgency LIKE '%${utils.sanitize(data.travelagency)}%' `);
            if (data.bookingPartnerId) whereClauses.push(` p.customerID = ${utils.sanitize(data.bookingPartnerId)} `);

            whereClauses.push(` DATE_FORMAT(pt.tourDate, '%Y-%m-%d') >= '${data.from}' `);
            whereClauses.push(` DATE_FORMAT(pt.tourDate, '%Y-%m-%d') <= '${data.to}' `);

            let sql = `SELECT prod.name AS productName,
            p.travelerFirstname, p.travelerLastname, p.totalGross, p.purchaseDate, p.purchaseID, p.myobImport, pt.tourDate,
                pt.noOfAdult, pt.adultPrice, p.email,
                pt.noOfChildren, pt.childPrice,
                pt.noOfFamilyGroups, pt.familyRate,
                pt.noOfAddAdult, pt.additionalRate,
                pt.noOfAddChildren, pt.additionalRate,
                pt.status, pt.bookingRefID, pt.bookingSource, pt.travelAgency, pt.originCountry, pt.famils,
                c.name AS customerName,
                CONCAT(u.firstname,' ',u.lastname) AS staffName
                FROM purchase_tour pt
                INNER JOIN purchase p ON p.purchaseID = pt.purchaseID
                INNER JOIN product prod ON prod.productID = pt.productID
                LEFT JOIN customer c ON c.customerID = p.customerID
                LEFT JOIN user u ON u.userID = p.enteredBy
                WHERE true AND ${whereClauses.join(` AND `)} GROUP BY p.purchaseID`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    let promises = [];
                    results.map(item => {
                        promises.push(new Promise((localResolve, localReqect) => {
                            db.get().execute(`SELECT purchaseID, SUM(addedToAccounting = TRUE) as added, COUNT(*) as total FROM charge WHERE purchaseID = ${item.purchaseID} GROUP BY purchaseID`, (err, localResults) => {
                                if (err) {
                                    localReqect(err.message);
                                } else {
                                    localResults.map(localItem => {
                                        results.map((item, index) => {
                                            if (item.purchaseID === localItem.purchaseID) {
                                                results[index].chargesAdded = (localItem.added ? parseInt(localItem.added) : 0);
                                                results[index].chargesTotal = (localItem.total ? parseInt(localItem.total) : 0);
                                            }
                                        });
                                    });

                                    localResolve();
                                }
                            });
                        }));
                    });

                    Promise.all(promises).then(() => {
                        resolve(results);
                    }).catch(error => {
                        reject(error);
                    });
                }
            });
        }).catch(error => {
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
const findFutureBookingByDate = (date) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
        });

        Joi.validate({date}, schema).then(() => {
            let sql = `SELECT prod.name AS productName, pt.tourDate, pt.purchaseID,
                SUM(IF(pt.family = 0, pt.noOfAdult + pt.noOfChildren, pt.noOfFamilyGroups * 4 + pt.noOfAdditionals + noOfAddChildren)) AS totalGuest,
                a.total AS totalAllotment
                FROM purchase_tour pt
                INNER JOIN product prod ON prod.productID = pt.productID
                INNER JOIN allotment a ON a.productID = pt.productID AND a.allotmentDate = pt.tourDate
                WHERE DATE_FORMAT(pt.tourDate,'%Y-%m-%d') = '${date}' AND pt.status = 'active' GROUP BY prod.productID`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    let productQueries = [];
                    results.map(item => {
                        productQueries.push(new Promise((resolve, reject) => {
                            db.get().execute(`SELECT pm.purchaseID, pm.qty, pm.productID, prod.name
                                FROM purchase_misc pm
                                INNER JOIN product prod ON prod.productID = pm.productID
                                WHERE purchaseID = ${item.purchaseID} AND prod.includeInUpcomingTourReport IS TRUE`, (err, results) => {
                                if (err) {
                                    reject(err.message);
                                } else {
                                    resolve(results);
                                }
                            });
                        }));
                    })

                    Promise.all(productQueries).then((productResults) => {
                        productResults.map(item => {
                            item.map(subItem => {
                                results.map((tourItem, tourIndex) => {
                                    if (tourItem.purchaseID === subItem.purchaseID) {
                                        if (!results[tourIndex].products) results[tourIndex].products = [];
                                        results[tourIndex].products.push(subItem);
                                    }
                                });
                            });
                        });

                        resolve(results);
                    }).catch(error => {
                        reject(error);
                    });
                }
            });
        }).catch(error => {
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
const findFutureBooking = (date) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
        });

        Joi.validate({date}, schema).then(() => {
            let sql = `SELECT pt.*,
                p.travelerLastname, p.phone, p.hotel, p.additionalNames, p.internalNotes,
                prod.name AS productName,
                SUM(IF(c.type = 'payment',c.amount,-1*c.amount)) AS totalPaid,
                cust.myob
            FROM purchase_tour pt
            INNER JOIN purchase p ON p.purchaseID = pt.purchaseID
            INNER JOIN product prod ON prod.productID = pt.productID
            LEFT JOIN customer cust ON cust.customerID = p.customerID
            LEFT JOIN charge c ON c.purchaseID = pt.purchaseID
            WHERE DATE_FORMAT(pt.tourDate,'%Y-%m-%d') > '${date}'
            AND DATE_FORMAT(pt.tourDate,'%Y-%m-%d') <=  DATE_ADD('${date}',INTERVAL 2 WEEK)
            AND pt.status = 'active'
            GROUP BY p.purchaseID`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve(results);
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

module.exports = { create, setPurchaseAsCancelled, setPurchaseAsRefunded, update, setCheckIn, setNoShow, findFutureBookingByDate, findFutureBooking, financialAnalysis };
