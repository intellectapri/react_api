/**
 * Misc purchases
 */
var Joi = require('joi');
const db = require('./../../shared/db');
const tourPurchasesFind = require('./tour.find');
const purchases = require('./index');
const miscDelete = require('./misc.delete');
const bookingPartners = require('./../bookingPartners');
const {regenerateBookingPartnerInvoices} = require('./regenerateBookingPartnerInvoices');

const utils = require('./../../shared/utils');
const config = require('./../../../../config/config');

const getTotal = (data) => {
    let total = 0;
    data.products.map(item => {
        total = total + (parseFloat(item.price) * parseFloat(item.qty));
    });

    return total;
}

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
            let sql = `SELECT
                    pm.qty, pm.purchaseID, pm.productID,
                    DATE_FORMAT(CONVERT_TZ(purch.enteredAt, '${config.systemTimeZone}', '${config.applicationTimeZone}'), '%Y-%m-%d') as purchaseDate,
                    DATE_FORMAT(CONVERT_TZ(pt.tourDate, '${config.systemTimeZone}', '${config.applicationTimeZone}'), '%Y-%m-%d') as tourDate,
                    prod.name AS productName
                FROM purchase_misc pm
                INNER JOIN purchase purch ON purch.purchaseID = pm.purchaseID
                LEFT JOIN purchase_tour pt ON pt.purchaseID = pm.purchaseID
                INNER JOIN product prod ON prod.productID = pm.productID
                WHERE (
                    DATE_FORMAT(CONVERT_TZ(enteredAt, '${config.systemTimeZone}', '${config.applicationTimeZone}'), '%Y-%m-%d') = '${date}'
                    OR
                    DATE_FORMAT(CONVERT_TZ(tourDate, '${config.systemTimeZone}', '${config.applicationTimeZone}'), '%Y-%m-%d') = '${date}'
                )`;

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
            let sql = `SELECT
                pm.qty, pm.purchaseID, pm.productID,
                DATE_FORMAT(CONVERT_TZ(purch.enteredAt, '${config.systemTimeZone}', '${config.applicationTimeZone}'), '%Y-%m-%d') as purchaseDate,
                DATE_FORMAT(CONVERT_TZ(pt.tourDate, '${config.systemTimeZone}', '${config.applicationTimeZone}'), '%Y-%m-%d') as tourDate,
                prod.name AS productName
            FROM purchase_misc pm
            INNER JOIN purchase purch ON purch.purchaseID = pm.purchaseID
            LEFT JOIN purchase_tour pt ON pt.purchaseID = pm.purchaseID
            INNER JOIN product prod ON prod.productID = pm.productID
            WHERE
            (
                DATE_FORMAT(CONVERT_TZ(purch.enteredAt, '${config.systemTimeZone}', '${config.applicationTimeZone}'), '%Y-%m-%d') >= '${date}'
                AND
                DATE_FORMAT(CONVERT_TZ(purch.enteredAt, '${config.systemTimeZone}', '${config.applicationTimeZone}'), '%Y-%m-%d') <= DATE_ADD('${date}',INTERVAL 4 WEEK)
                
                OR

                DATE_FORMAT(CONVERT_TZ(pt.tourDate, '${config.systemTimeZone}', '${config.applicationTimeZone}'), '%Y-%m-%d') >= '${date}'
                AND
                DATE_FORMAT(CONVERT_TZ(pt.tourDate, '${config.systemTimeZone}', '${config.applicationTimeZone}'), '%Y-%m-%d') <= DATE_ADD('${date}',INTERVAL 4 WEEK)
            )`;

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


/**
 * Creates standalone misc purchase
 * 
 * @param {Object} data   Purchase data
 * @param {Number} userId Author user identifier
 * 
 * @returns {Promise}
 */
const create = (data, userId) => {
    return new Promise((resolve, reject) => {
        let total = getTotal(data);
        data.totalGross = total + '';
        data.commission = 0;
        data.totalNet = total + '';

        bookingPartners.getDirectSaleBookingPartnerId().then(directSaleBookingPartnerId => {
            data.customerId = directSaleBookingPartnerId;
            data.userId = userId.toString();

            purchases.create(data, userId).then(purchaseId => {
                let promises = [];
                data.products.map(item => {
                    promises.push(saveSingleMiscPurchase(purchaseId, item));
                });

                Promise.all(promises).then(products => {
                    resolve({ purchaseId, products });
                }).catch(reject);
            }).catch(reject);
        }).catch(reject);
    });
};

/**
 * Creates dependent misc purchase (linked to existing tour purchase)
 * 
 * @param {Object} data             Purchase data
 * @param {Number} parentPurchaseId Parent purchase identifier
 * 
 * @returns {Promise}
 */
const addtotour = (data, parentPurchaseId) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            purchaseDate: Joi.string().required(),
            products: Joi.array().items(Joi.object().keys({
                productId: Joi.number().integer().required(),
                price: Joi.string().required(),
                qty: Joi.string().required()
            })).required()
        });

        Joi.validate(data, schema, (err, value) => {
            if (err) {
                reject(err);
            } else {
                tourPurchasesFind.findByPurchaseId(parentPurchaseId).then(() => {
                    let promises = [];
                    data.products.map(item => {
                        promises.push(saveSingleMiscPurchase(parentPurchaseId, item));
                    });

                    Promise.all(promises).then(() => {
                        purchases.recalculateTotal(parentPurchaseId).then(resolve).catch(reject);
                    }).catch(reject);
                }).catch(reject);
            }
        });
    });
};

const saveSingleMiscPurchase = (purchaseId, product) => {
    return new Promise((resolve, reject) => {
        detailId = (product.detailId ? product.detailId : 0);
        if (`productId` in product === false || `price` in product === false || `qty` in product === false) {
            throw new Error(`Invalid product description`);
        }

        let sql = `INSERT INTO purchase_misc SET purchaseID = ${purchaseId}, productID = ${product.productId}, price = ${product.price}, qty = ${product.qty} `;
        db.get().execute(sql, (err, results) => {
            if (err) {
                reject(err);
            } else {
                product.detailId = results.insertId;
                resolve(product);
            }
        });
    });
};

/**
 * Updates misc purchase
 * 
 * @param {Object} data   Purchase data
 * @param {Number} userId Author user identifier
 * 
 * @returns {Promise}
 */
const update = (data, userId) => {
    return new Promise((resolve, reject) => {
        let total = getTotal(data);
        data.totalGross = total + '';
        data.commission = 0;
        data.totalNet = total + '';

        purchases.find(data.purchaseId).then(purchase => {
            miscDelete.deleteAllMiscPurchasesForPurchase(data.purchaseId).then(() => {
                data.customerId = purchase.customerID;
                // Check if the purchase is the standalone one
                db.get().execute(`SELECT * FROM purchase_tour WHERE purchaseID = ${data.purchaseId}`, (err, results) => {
                    if (err) { reject(err); return; }

                    let isStandalone = (results.length === 0);
                    if (isStandalone === false) data.noPurchaseDate = true;
                    purchases.update(data, userId).then(() => {
                        let promises = [];
                        data.products.map(item => { promises.push(saveSingleMiscPurchase(data.purchaseId, item)); });
                        Promise.all(promises).then(() => {
                            if (isStandalone) {
                                resolve();
                            } else {
                                // Recalculate values for non-standalone purchases
                                purchases.recalculateTotal(data.purchaseId).then(() => {
                                    // Check if confirmation sending is really required
                                    if (true && purchase.customerID !== 211) {
                                        regenerateBookingPartnerInvoices(data.purchaseId, purchase.customerID, userId, data.bookingPartnerEmail).then(() => {
                                            resolve();
                                        }).catch(reject);
                                    } else {
                                        resolve();
                                    }
                                }).catch(reject);
                            }
                        }).catch(reject);
                    }).catch(reject);
                });
            }).catch(reject);
        }).catch(reject);
    });
};

/**
 * Performs financial analysis
 * 
 * @param {String}  data     Analysis options
 * @param {Booelan} extended Specifies if results should be extended with tour purchase if it exists
 * 
 * @returns {Promise}
 */
const financialAnalysis = (data, extended) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer(),
            deliveryFrom: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            deliveryTo: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            purchaseFrom: Joi.string().regex(utils.DATE_CHECK_REGEXP),
            purchaseTo: Joi.string().regex(utils.DATE_CHECK_REGEXP)
        });

        Joi.validate(data, schema).then(() => {
            let whereClauses = [];
            if (data.productId) whereClauses.push(` pm.productID = ${utils.sanitize(data.productId)} `);

            whereClauses.push(` ((pt.tourDate IS NULL AND DATE_FORMAT(purch.enteredAt, '%Y-%m-%d') >= '${data.deliveryFrom}') OR (pt.tourDate IS NOT NULL AND DATE_FORMAT(pt.tourDate, '%Y-%m-%d') >= '${data.deliveryFrom}')) `);

            whereClauses.push(` ((pt.tourDate IS NULL AND DATE_FORMAT(purch.enteredAt, '%Y-%m-%d') <= '${data.deliveryTo}') OR (pt.tourDate IS NOT NULL AND DATE_FORMAT(pt.tourDate, '%Y-%m-%d') <= '${data.deliveryTo}')) `);

            if (data.purchaseFrom) whereClauses.push(` DATE_FORMAT(purch.enteredAt, '%Y-%m-%d') >= '${data.purchaseFrom}' `);
            if (data.purchaseTo) whereClauses.push(` DATE_FORMAT(purch.enteredAt, '%Y-%m-%d') <= '${data.purchaseTo}' `);

            let purchaseTourSelects = `pt.tourDate`;
            if (extended) {
                purchaseTourSelects = ` purch.travelerFirstname, purch.travelerLastname,
                purch.totalGross, pt.tourDate,
                pt.noOfAdult, pt.adultPrice,
                pt.noOfChildren, pt.childPrice,
                pt.noOfFamilyGroups, pt.familyRate,
                pt.noOfAddAdult, pt.additionalRate,
                pt.noOfAddChildren, pt.additionalRate,
                pt.status, pt.bookingRefID, pt.bookingSource, pt.travelAgency, pt.originCountry, pt.famils,
                c.name AS customerName, CONCAT(u.firstname, ' ', u.lastname) AS staffName `;
            }

            let sql = `SELECT pm.purchaseID, pm.price, pm.qty, purch.enteredAt as purchaseDate, purch.purchaseDate as purchaseDateAlt, prod.productID as productId, prod.name as productName, ${purchaseTourSelects}
                FROM purchase_misc pm
                INNER JOIN purchase purch ON purch.purchaseID = pm.purchaseID
                INNER JOIN product prod ON prod.productID = pm.productID
                LEFT JOIN purchase_tour pt ON pt.purchaseID = pm.purchaseID
                LEFT JOIN customer c ON c.customerID = purch.customerID
                LEFT JOIN user u ON u.userID = purch.enteredBy
                WHERE true AND ${whereClauses.join(` AND `)}`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    let resultsPrepared = [];
                    results.map(item => {
                        item.standalone = (item.tourDate ? false : true);
                        resultsPrepared.push(item);
                    });

                    let promises = [];
                    resultsPrepared.map(item => {
                        promises.push(new Promise((localResolve, localReqect) => {
                            db.get().execute(`SELECT purchaseID, SUM(addedToAccounting = TRUE) as added, COUNT(*) as total FROM charge WHERE purchaseID = ${item.purchaseID} GROUP BY purchaseID`, (err, localResults) => {
                                if (err) {
                                    localReqect(err.message);
                                } else {
                                    localResults.map(localItem => {
                                        resultsPrepared.map((item, index) => {
                                            if (item.purchaseID === localItem.purchaseID) {
                                                resultsPrepared[index].chargesAdded = (localItem.added ? parseInt(localItem.added) : 0);
                                                resultsPrepared[index].chargesTotal = (localItem.total ? parseInt(localItem.total) : 0);
                                            }
                                        });
                                    });

                                    localResolve();
                                }
                            });
                        }));
                    });

                    Promise.all(promises).then(() => {
                        resolve(resultsPrepared);
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
 * Finds misc purchases by theirs purchase identifier
 * 
 * @param {String} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */
const findByPurchaseId = (purchaseId) => {
    return new Promise((resolve, reject) => {
        db.get().execute(`SELECT * FROM purchase_misc pm
            LEFT JOIN product prod ON prod.productID = pm.productID
            WHERE purchaseID = ${purchaseId}`, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

module.exports = { create, update, findFutureBooking, findFutureBookingByDate, findByPurchaseId, addtotour, financialAnalysis};
