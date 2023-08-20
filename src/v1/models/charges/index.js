/**
 * Charges
 */

var Joi = require('joi');
const utils = require('./../../shared/utils');
const db = require('./../../shared/db');
const balance = require('./balance').balance;
const purchases = require('./../purchases/tour');
const config = require('./../../../../config/config');
const voucher = require('../discount');

/**
 * Creates payment for purchase
 * 
 * @param {Object} data   Payment information
 * @param {String} userId Author user identifier
 * 
 * @returns {Promise}
 */
const payment = (data, userId) => {
    return new Promise((resolve, reject) => {
        Joi.validate(data, Joi.object().keys({
            purchaseId: Joi.number().integer().required(),
            paymentDate: Joi.string().regex(utils.DATE_CHECK_REGEXP),
            amount: Joi.number().precision(2).required(),
            method: Joi.string().required(),
            internalNotes: Joi.string().optional().allow('')
        })).then(() => {
            let insertValues = [];
            insertValues.push(` purchaseID = ${utils.sanitize(data.purchaseId)} `);
            insertValues.push(` paymentDate = '${utils.sanitize(data.paymentDate)}' `);
            insertValues.push(` type = 'payment' `);
            insertValues.push(` amount = ${utils.sanitize(data.amount)} `);
            insertValues.push(` method = '${utils.sanitize(data.method)}' `);
            if (data.internalNotes) insertValues.push(` internalNotes = '${utils.sanitize(data.internalNotes)}' `);
            insertValues.push(` addedTime = NOW() `);
            insertValues.push(` addedStaff = ${userId} `);

            db.get().execute(`INSERT INTO charge SET ${insertValues.join(`,`)}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else if (results.insertId >= 0) {
                    resolve({ id: results.insertId });
                } else {
                    reject('Unable to create charge');
                }
            });
        }).catch(error => {
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
const refund = (data, userId) => {
    return new Promise((resolve, reject) => {
        Joi.validate(data, Joi.object().keys({
            purchaseId: Joi.number().integer().required(),
            paymentDate: Joi.string().regex(utils.DATE_CHECK_REGEXP),
            amount: Joi.number().precision(2),
            method: Joi.string().required(),
            refundReason: Joi.string().required(),
            internalNotes: Joi.string().optional().allow('')
        })).then(() => {
            let insertValues = [];
            insertValues.push(` purchaseID = ${utils.sanitize(data.purchaseId)} `);
            insertValues.push(` paymentDate = '${utils.sanitize(data.paymentDate)}' `);
            insertValues.push(` type = 'refund' `);
            insertValues.push(` amount = ${utils.sanitize(data.amount)} `);
            insertValues.push(` method = '${utils.sanitize(data.method)}' `);
            insertValues.push(` refundReason = '${utils.sanitize(data.refundReason)}' `);
            if (data.internalNotes) insertValues.push(` internalNotes = '${utils.sanitize(data.internalNotes)}' `);
            insertValues.push(` addedTime = NOW() `);
            insertValues.push(` addedStaff = ${userId} `);

            balance(data.purchaseId).then(balanceAmount => {
                db.get().execute(`SELECT totalNet FROM purchase WHERE purchaseID = ${parseInt(data.purchaseId)}`, (err, result) => {
                    if (err) { reject(err.message); return }

                    let fullRefund = false;
                    if (result.length === 1) {
                        fullRefund = (parseFloat(data.amount) === (parseFloat(balanceAmount)));
                    }

                    db.get().execute(`INSERT INTO charge SET ${insertValues.join(`,`)}`, (err, results) => {
                        if (err) { reject(err.message); return }
        
                        if (results.insertId >= 0) {
                            if (fullRefund) {
                                purchases.setPurchaseAsRefunded(data.purchaseId).then(() => {
                                    resolve({ id: results.insertId });
                                }).catch(reject);
                            } else {
                                resolve({ id: results.insertId });
                            }
                        } else {
                            reject('Unable to create charge');
                        }
                    });
                });
            }).catch(reject);
        }).catch(error => {
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
const history = (purchaseId) => {
    return new Promise((resolve, reject) => {
        if (parseInt(purchaseId) > 0) {
            db.get().execute(`SELECT totalNet, customerID FROM purchase WHERE purchaseID = ${parseInt(purchaseId)}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else if (results.length === 1) {
                    db.get().execute(`SELECT * FROM customer WHERE customerID = ${parseInt(results[0].customerID)}`, (err, bookingPartnerData) => {
                        if (err) {
                            reject(err.message);
                        } else {
                            let totalNet = 0;
                            if (results.length === 1 && results[0].totalNet) totalNet = parseFloat(results[0].totalNet);
                            db.get().execute(`SELECT * FROM charge WHERE purchaseID = ${parseInt(purchaseId)}`, (err, results) => {
                                if (err) {
                                    reject(err.message);
                                } else {
                                    let bookingPartnerPaymentMethod = false;
                                    if (bookingPartnerData && bookingPartnerData[0].paymentMethod && config.paymentMethods.indexOf(bookingPartnerData[0].paymentMethod) > -1) {
                                        bookingPartnerPaymentMethod = bookingPartnerData[0].paymentMethod;
                                    }
                                    db.get().execute(`SELECT voucherIDs FROM purchase_tour WHERE purchaseID='${purchaseId}'`, (err , res) => {
                                        if(err){
                                            reject(err.message)
                                        }
                                        
                                        if( res.length > 0  && res[0]['voucherIDs']){
                                            res[0]['voucherIDs'].split(',').map( voucherId => {
                                                voucher.get(voucherId).then( discount => {
                                                    
                                                    voucher.update(voucherId, {
                                                        discountCode: discount.discountCode,
                                                        discountAmount: discount.discountAmount,
                                                        discountType: discount.discountType,
                                                        expireDate: discount.expireDate,
                                                        oneTimeUse: discount.oneTimeUse,
                                                        useCount: discount.useCount,
                                                        active: 0,
                                                    } );
                                                    
                                                    resolve({
                                                        totalNet: totalNet,
                                                        history: results,
                                                        bookingPartnerPaymentMethod
                                                    });

                                                }).catch( err => {
                                                    reject( err.message )
                                                })
                                            })
                                        }else{
                                            resolve({
                                                totalNet: totalNet,
                                                history: results,
                                                bookingPartnerPaymentMethod
                                            });
                                        }
                                    })
                                    
                                }
                            });
                        }
                    });
                } else {
                    reject(`Invalid purchase identifier`);
                }
            });
        } else {
            reject(`Invalid purchase identifier`);
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
const updateCharge = (chargeId, data, userId) => {
    return new Promise((resolve, reject) => {
        if (parseInt(chargeId) > 0) {
            db.get().execute(`UPDATE charge SET
                addedToAccountingUpdatedBy = ${userId}, addedToAccountingUpdatedAt = NOW(), addedToAccounting = ${data.addedToAccounting ? `TRUE` : `FALSE`}
                WHERE chargeID = ${parseInt(chargeId)}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve();
                }
            });
        } else {
            reject(`Invalid charge identifier`);
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
const updateChargesForPurchase = (purchaseId, data, userId) => {
    return new Promise((resolve, reject) => {
        if (parseInt(purchaseId) > 0) {
            db.get().execute(`SELECT * FROM charge WHERE purchaseId = ${parseInt(purchaseId)}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    let promises = [];
                    results.map(item => {
                        promises.push(updateCharge(item.chargeID, data, userId));
                    });

                    Promise.all(promises).then(() => {
                        resolve();
                    }).catch(error => {
                        reject(error);
                    });
                }
            });
        } else {
            reject(`Invalid charge identifier`);
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
const deleteCharge = (chargeId) => {
    return new Promise((resolve, reject) => {
        if (parseInt(chargeId) > 0) {
            db.get().execute(`DELETE FROM charge WHERE chargeID = ${parseInt(chargeId)}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve();
                }
            });
        } else {
            reject(`Invalid charge identifier`);
        }
    });
};

module.exports = { payment, refund, history, deleteCharge, updateChargesForPurchase, updateCharge };