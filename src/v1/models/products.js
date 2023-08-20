/**
 * Products
 */

var moment = require('moment');
var Joi = require('joi');
const utils = require('./../shared/utils');
const db = require('./../shared/db');

const bookingPartners = require('./bookingPartners');

/**
 * Product object schema
 */
const availabilityRegexp = /^\d{2}:\d{2}:\d{2}$/;
const allowedTypeCodesRegExp = /^(HIRES|TOURS|DRINKS|PACKAGES|MERCH|VOUCHERS)$/;
const schema = Joi.object().keys({
    name: Joi.string().required(),
    typeCode: Joi.string().regex(allowedTypeCodesRegExp).required(),
    isAvailable: Joi.string().required(),
    includeInUpcomingTourReport: Joi.number(),
    templateCode: Joi.string().allow(''),
    tourOperatorEmail: Joi.string().email().allow(''),
    cutoff: Joi.string().allow(''),
    minGuestNo: Joi.string().allow(''),
    basePrice: Joi.number(),
    childPrice: Joi.number(),
    familyRate: Joi.number(),
    additionalRate: Joi.number(),
    employeePrice: Joi.number(),
    availabilityMon: Joi.string().regex(availabilityRegexp).allow(''),
    availabilityTue: Joi.string().regex(availabilityRegexp).allow(''),
    availabilityWed: Joi.string().regex(availabilityRegexp).allow(''),
    availabilityThu: Joi.string().regex(availabilityRegexp).allow(''),
    availabilityFri: Joi.string().regex(availabilityRegexp).allow(''),
    availabilitySat: Joi.string().regex(availabilityRegexp).allow(''),
    availabilitySun: Joi.string().regex(availabilityRegexp).allow(''),
});

const prepareProduct = (product) => {
    let itemCopy = Object.assign({}, product);
    itemCopy.productId = itemCopy.productID;
    [`basePrice`, `childPrice`, `familyRate`, `additionalRate`, `employeePrice`].map(field => {
        itemCopy[field] = parseFloat(itemCopy[field] ? itemCopy[field] : 0);
    });

    [`Fri`, `Mon`, `Sat`, `Sun`, `Thu`, `Tue`, `Wed`].map(field => {
        itemCopy[`availability${field}`] = (itemCopy[`availability${field}`] ? itemCopy[`availability${field}`] : ``);
    });

    if (!itemCopy.tourOperatorEmail) itemCopy.tourOperatorEmail = ``;

    return itemCopy;
};

/**
 * Return existing product types
 * 
 * @returns {Promise}
 */
const getTypes = () => {
    return new Promise((resolve, reject) => {
        db.get().execute(`SELECT * FROM product_type`, (err, results) => {
            if (err) {
                reject(err.message);
            } else {
                resolve(results);
            }
        });
    });
};

/**
 * Return existing products
 * 
 * @returns {Promise}
 */
const list = (data = {}) => {
    return new Promise((resolve, reject) => {
        let whereClauses = [];
        if (data.typeCodes) {
            if (/^[a-zA-Z,]+$/.test(data.typeCodes)) {
                let subClauses = [];
                data.typeCodes.split(`,`).map(item => {
                    subClauses.push(` p.typeCode = '${item}' `);
                });

                whereClauses.push(` (${subClauses.join(` OR `)}) `)
            }
        }

        let whereClause = (whereClauses.length > 0 ? `WHERE ${whereClauses.join(` AND `)}` : ``);
        let sql = `SELECT p.*, pt.typeOfPurch FROM product p
            INNER JOIN product_type pt ON pt.typeCode = p.typeCode
            ${whereClause}
            ORDER BY p.typeCode, p.city, p.displayOrder`;
        
        db.get().execute(sql, (err, results) => {
            if (err) {
                reject(err.message);
            } else {
                let preparedResult = [];
                results.map(item => {
                    preparedResult.push(prepareProduct(item));
                });

                resolve(preparedResult);
            }
        });
    });
};

/**
 * Return specific product
 * 
 * @param {Number} productId Product identifier
 * 
 * @returns {Promise}
 */
const get = (productId) => {
    return new Promise((resolve, reject) => {
        if (productId > 0) {
            db.get().execute(`SELECT * FROM product WHERE productID = ${productId}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else if (results.length === 1) {
                    resolve(prepareProduct(results[0]));
                } else {
                    reject(utils.errors.NOT_FOUND);
                }
            });
        } else {
            reject(`Invalid product identifier`);
        }
    });
};

/**
 * Generates value SQL statements
 * 
 * @param {Object} data Product information
 * 
 * @return {Array}
 */
const generateValueStatements = (data) => {
    let valuesClauses = [];
    valuesClauses.push(` name = '${utils.sanitize(data.name)}' `);
    valuesClauses.push(` typeCode = '${utils.sanitize(data.typeCode)}' `);
    valuesClauses.push(` isAvailable = '${utils.sanitize(data.isAvailable)}' `);
    if (data.includeInUpcomingTourReport) valuesClauses.push(` includeInUpcomingTourReport = ${utils.sanitize(data.includeInUpcomingTourReport)} `);
    if (data.templateCode) valuesClauses.push(` templateCode = '${utils.sanitize(data.templateCode)}' `);
    if (data.tourOperatorEmail) valuesClauses.push(` tourOperatorEmail = '${utils.sanitize(data.tourOperatorEmail)}' `);
    if (data.cutoff) valuesClauses.push(` cutoff = '${utils.sanitize(data.cutoff)}' `);
    if (data.minGuestNo) valuesClauses.push(` minGuestNo = '${utils.sanitize(data.minGuestNo)}' `);
    if (data.basePrice) valuesClauses.push(` basePrice = ${utils.sanitize(data.basePrice)} `);
    if (data.childPrice) valuesClauses.push(` childPrice = ${utils.sanitize(data.childPrice)} `);
    if (data.familyRate) valuesClauses.push(` familyRate = ${utils.sanitize(data.familyRate)} `);
    if (data.additionalRate) valuesClauses.push(` additionalRate = ${utils.sanitize(data.additionalRate)} `);
    if (data.employeePrice) valuesClauses.push(` employeePrice = ${utils.sanitize(data.employeePrice)} `);

    valuesClauses.push(` availabilityMon = '${utils.sanitize(data.availabilityMon)}' `);
    valuesClauses.push(` availabilityTue = '${utils.sanitize(data.availabilityTue)}' `);
    valuesClauses.push(` availabilityWed = '${utils.sanitize(data.availabilityWed)}' `);
    valuesClauses.push(` availabilityThu = '${utils.sanitize(data.availabilityThu)}' `);
    valuesClauses.push(` availabilityFri = '${utils.sanitize(data.availabilityFri)}' `);
    valuesClauses.push(` availabilitySat = '${utils.sanitize(data.availabilitySat)}' `);
    valuesClauses.push(` availabilitySun = '${utils.sanitize(data.availabilitySun)}' `);
    valuesClauses.push(` city = 'Sydney' `);

    return valuesClauses;
};

/**
 * Create product
 * 
 * @param {Object} data Product information
 * 
 * @returns {Promise}
 */
const create = (data) => {
    return new Promise((resolve, reject) => {
        Joi.validate(data, schema).then(() => {
            let valuesClauses = generateValueStatements(data);
            let sql = `INSERT INTO product SET ${valuesClauses.join(` , `)}`;
            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve(results.insertId);
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

/**
 * Update product
 * 
 * @param {Number} productId Product identifier
 * @param {Object} data      Product information
 * 
 * @returns {Promise}
 */
const update = (productId, data) => {
    return new Promise((resolve, reject) => {
        if (productId > 0) {
            
            Joi.validate(data, schema).then(() => {
                let valuesClauses = generateValueStatements(data);
                let sql = `UPDATE product SET ${valuesClauses.join(` , `)} WHERE productID = ${productId}`;
                db.get().execute(sql, (err, results) => {
                    if (err) {
                        reject(err.message);
                    } else {
                        resolve();
                    }
                });
            }).catch(error => {
                reject(error);
            });
        } else {
            reject(`Invalid product identifier`);
        }
    });
};

/**
 * Update sorting order of products
 * 
 * @param {Array} order Sorting order data
 * 
 * @returns {Promise}
 */
const updateOrder = (order) => {
    return new Promise((resolve, reject) => {
        let promises = [];
        for (let key in order) {
            let item = order[key];
            let localPromise = new Promise((resolve, reject) => {
                db.get().execute(`UPDATE product SET displayOrder = '${item.displayOrder}' WHERE productID = ${item.productID}`, (err, results) => {
                    if (err) {
                        reject(err.message);
                    } else {
                        resolve();
                    }
                });
            });
            
            promises.push(localPromise);
        }

        Promise.all(promises).then(resolve).catch(reject);
    });
};

/**
 * Delete the product
 * 
 * @param {Number} productId Product identifier
 * 
 * @returns {Promise}
 */
const deleteProduct = (productId) => {
    return new Promise((resolve, reject) => {
        if (productId > 0) {
            db.get().execute(`UPDATE product SET archived = NOW() WHERE productID = ${productId}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve(results.insertId);
                }
            });
        } else {
            reject(`Invalid product identifier`);
        }
    });
};

/**
 * Restore the product
 * 
 * @param {Number} productId Product identifier
 * 
 * @returns {Promise}
 */
const restoreProduct = (productId) => {
    return new Promise((resolve, reject) => {
        if (productId > 0) {
            db.get().execute(`UPDATE product SET archived = NULL WHERE productID = ${productId}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve();
                }
            });
        } else {
            reject(`Invalid product identifier`);
        }
    });
};

/**
 * Gets season prices for specific date
 * 
 * @param {Object} product Product description
 * @param {String} date    Requested date
 * 
 * @returns {Promise}
 */
const getProductPricesRegardingSeason = (product, date) => {
    return new Promise((resolve, reject) => {
        getSeasons(product.productID).then(seasons => {
            let requestedDate = moment(date, `YYYY-MM-DD`);

            let prices = {
                seasonName: false,
                adultPrice: (product[`basePrice`] ? parseFloat(product[`basePrice`]).toFixed(2) : `0.00`),
                childPrice: (product[`childPrice`] ? parseFloat(product[`childPrice`]).toFixed(2) : `0.00`),
                familyRate: (product[`familyRate`] ? parseFloat(product[`familyRate`]).toFixed(2) : `0.00`),
                additionalRate: (product[`additionalRate`] ? parseFloat(product[`additionalRate`]).toFixed(2) : `0.00`),
                infantRate: (product[`infantRate`] ? parseFloat(product[`infantRate`]).toFixed(2) : `0.00`),
                seniorConsessionRate: (product[`seniorConsessionRate`] ? parseFloat(product[`seniorConsessionRate`]).toFixed(2) : `0.00`),
            };

            seasons.map(season => {
                let start = moment(season.startDate, `YYYY-MM-DD`);
                let finish = moment(season.finishDate, `YYYY-MM-DD`);
                if (moment(requestedDate).isBetween(start, finish, null, '[]')) {
                    prices = {
                        seasonName: season.name,
                        adultPrice: (season[`adultRate`] ? parseFloat(season[`adultRate`]).toFixed(2) : `0.00`),
                        childPrice: (season[`childRate`] ? parseFloat(season[`childRate`]).toFixed(2) : `0.00`),
                        familyRate: (season[`familyRate`] ? parseFloat(season[`familyRate`]).toFixed(2) : `0.00`),
                        additionalRate: (season[`additionalAdultRate`] ? parseFloat(season[`additionalAdultRate`]).toFixed(2) : `0.00`),
                        infantRate: (season[`infantRate`] ? parseFloat(season[`infantRate`]).toFixed(2) : `0.00`),
                        seniorConsessionRate: (season[`seniorConsessionRate`] ? parseFloat(season[`seniorConsessionRate`]).toFixed(2) : `0.00`),
                    };
                }
            });

            resolve(prices);
        }).catch(reject);
    });
};

/**
 * Return the tour pricing for specific product
 * 
 * @param {Number} productId        Product identifier
 * @param {Number} bookingPartnerId Booking partner identifier
 * @param {String} date             Date for which prices are actualized
 * 
 * @returns {Promise}
 */
const tourPricing = (productId, bookingPartnerId, date) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer().required(),
            bookingPartnerId: Joi.number().integer().required(),
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
        });

        Joi.validate({productId, bookingPartnerId, date}, schema).then(() => {
            bookingPartners.getBookingPartnerOverrideValues(bookingPartnerId).then(bookingPartnerValues => {
                const proceedWithPricing = (product) => {
                    if (bookingPartnerValues === false) {
                        if (productId === 0) {
                            resolve({ status: `empty` });
                        } else {
                            getProductPricesRegardingSeason(product, date).then(productPrices => {
                                resolve({
                                    status: `success`,
                                    appliedSeasonName: productPrices.seasonName,
                                    overriddenByBookingPartner: false,
                                    adultPrice: (productPrices[`adultPrice`] ? parseFloat(productPrices[`adultPrice`]).toFixed(2) : `0.00`),
                                    childPrice: (productPrices[`childPrice`] ? parseFloat(productPrices[`childPrice`]).toFixed(2) : `0.00`),
                                    familyRate: (productPrices[`familyRate`] ? parseFloat(productPrices[`familyRate`]).toFixed(2) : `0.00`),
                                    additionalRate: (productPrices[`additionalRate`] ? parseFloat(productPrices[`additionalRate`]).toFixed(2) : `0.00`),
                                    infantRate: (productPrices[`infantRate`] ? parseFloat(productPrices[`infantRate`]).toFixed(2) : `0.00`),
                                    seniorConsessionRate: (productPrices[`seniorConsessionRate`] ? parseFloat(productPrices[`seniorConsessionRate`]).toFixed(2) : `0.00`),
                                    tourCity: product[`city`],
                                    confirmedByPartner: (product[`tourOperatorEmail`] ? 1 : 0),
                                    emailTemplate: product[`templateCode`]
                                });
                            }).catch(reject);
                        }
                    } else {
                        resolve({
                            status: `success`,
                            appliedSeasonName: false,
                            overriddenByBookingPartner: true,
                            adultPrice: (bookingPartnerValues[`adultPrice`] ? parseFloat(bookingPartnerValues[`adultPrice`]).toFixed(2) : `0.00`),
                            childPrice: (bookingPartnerValues[`childPrice`] ? parseFloat(bookingPartnerValues[`childPrice`]).toFixed(2) : `0.00`),
                            familyRate: (bookingPartnerValues[`familyPrice`] ? parseFloat(bookingPartnerValues[`familyPrice`]).toFixed(2) : `0.00`),
                            additionalRate: (bookingPartnerValues[`additionalAdultPrice`] ? parseFloat(bookingPartnerValues[`additionalAdultPrice`]).toFixed(2) : `0.00`),
                            infantRate: (bookingPartnerValues[`infantPrice`] ? parseFloat(bookingPartnerValues[`infantPrice`]).toFixed(2) : `0.00`),
                            seniorConsessionRate: (bookingPartnerValues[`seniorConcessionPrice`] ? parseFloat(bookingPartnerValues[`seniorConcessionPrice`]).toFixed(2) : `0.00`),
                            tourCity: product[`city`],
                            confirmedByPartner: (product[`tourOperatorEmail`] ? 1 : 0),
                            emailTemplate: product[`templateCode`]
                        });
                    }
                }

                if (productId !== 0) {
                    get(productId).then(product => {
                        proceedWithPricing(product);
                    }).catch(reject);
                } else {
                    proceedWithPricing(false);
                }
            }).catch(reject);
        }).catch(error => {
            reject(error);
        });
    });
};

/**
 * Return the miscellaneous pricing for specific product
 * 
 * @param {Number} id Product identifier
 * 
 * @returns {Promise}
 */
const miscPricing = (id) => {
    return new Promise((resolve, reject) => {
        if (id > 0) {
            get(id).then(product => {
                resolve([{ name: `price`, value: product[`basePrice`] }]);
            }).catch(reject);
        } else {
            reject(`Invalid product identifier`);
        }
    });
};

/**
 * Checks if product is available on specific day if week
 * 
 * @param {Number} id  Product identifier
 * @param {String} day Day of the week name
 * 
 * @returns {Promise}
 */
const isAvailable = (id, day) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            id: Joi.number().integer().required(),
            day: Joi.string().regex(utils.DAYS_OF_WEEK_CHECK_REGEXP).required()
        });

        Joi.validate({ id, day }, schema).then(() => {
            let capitalizedDay = day.charAt(0).toUpperCase() + day.substr(1);
            let sql = `SELECT * FROM product WHERE productID = ${id} AND availability${capitalizedDay} != ''`;
            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else if (results.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        }).catch(reject);
    });
};

/**
 * Returns tour time
 * 
 * @param {Number} productId Product identifier
 * @param {String} tourDate  Tour date
 * 
 * @returns {Promise}
 */
const getTourTime = (productId, tourDate) => {
    return new Promise((resolve, reject) => {
        if (productId > 0 && utils.DATE_CHECK_REGEXP_OBJECT.test(tourDate)) {
            let sql = `SELECT availabilityMon, availabilityTue, availabilityWed, availabilityThu,
                availabilityFri, availabilitySat, availabilitySun FROM product
                WHERE productID = ${productId}`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err);
                } else if (results.length === 1) {
                    let line = results[0];

                    let time = false;
                    let date = moment(tourDate);
                    if (line[`availability${date.format(`ddd`)}`]) {
                        time = line[`availability${date.format(`ddd`)}`];
                    } else {
                        // if time is empty on the day, use the first available time of the week
                        [`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`].map(day => {
                            if (line[`availability${day}`]) {
                                time = line[`availability${day}`];
                                return false;
                            }
                        });
                    }

                    resolve(time);
                } else {
                    reject(`Unable to find product with identifier ${productId}`);
                }
            });
        } else {
            reject(`Invalid paramters were provided`);
        }
    });
};

/**
 * Returns price seasons for specific product
 * 
 * @param {Number} productId Product identifier
 * 
 * @returns {Promise}
 */
const getSeasons = (productId) => {
    return new Promise((resolve, reject) => {
        db.get().execute(`SELECT
            seasonID, name, notes, DATE_FORMAT(startDate,'%Y-%m-%d') as startDate, DATE_FORMAT(finishDate,'%Y-%m-%d') as finishDate, adultRate, childRate, infantRate, familyRate,
            additionalAdultRate, additionalChildRate, seniorConcessionRate, createdAt, createdBy
            FROM price_seasons WHERE productID = ${productId}`, (err, results) => {
            if (err) { reject(err); return; }
            resolve(results);
        });
    });
};

/**
 * Updates price seasons for specific product
 * 
 * @param {Number} productId Product identifier
 * @param {Object} data      List of seasons
 * @param {Number} userId    Author user identifier
 * 
 * @returns {Promise}
 */
const updateSeasons = (productId, data, userId) => {
    return new Promise((resolve, reject) => {
        if (!productId) { reject(`Product identifier is not specified`); return; }
        if (!userId) { reject(`User identifier is not specified`); return; }

        db.get().execute(`DELETE FROM price_seasons WHERE productID = ${productId}`, (err) => {
            if (err) { reject(err); return; }

            let sqls = [];
            for (let key in data) {
                let inputSeason = data[key];
                let valueStatements = [` productID = ${productId} `];
                if (inputSeason.name) {
                    valueStatements.push(` name = '${utils.sanitize(inputSeason.name)}' `);
                } else {
                    reject(`Missing season name`);
                }

                if (inputSeason.notes) valueStatements.push(` notes = '${utils.sanitize(inputSeason.notes)}' `);

                if (inputSeason.startDate && utils.DATE_CHECK_REGEXP_OBJECT.test(inputSeason.startDate)) {
                    valueStatements.push(` startDate = '${inputSeason.startDate}' `);
                } else {
                    reject(`Missing season start date`);
                }

                if (inputSeason.finishDate && utils.DATE_CHECK_REGEXP_OBJECT.test(inputSeason.finishDate)) {
                    valueStatements.push(` finishDate = '${inputSeason.finishDate}' `);
                } else {
                    reject(`Missing season finish date`);
                }

                let startDate = moment(inputSeason.startDate, `YYYY-MM-DD`);
                let finishDate = moment(inputSeason.finishDate, `YYYY-MM-DD`);

                if (moment(finishDate).isBefore(startDate)) {
                    reject(`Start date should be before finish date`);
                }

                if (inputSeason.adultRate !== false && inputSeason.adultRate >= 0) valueStatements.push(` adultRate = ${inputSeason.adultRate} `);
                if (inputSeason.childRate !== false && inputSeason.childRate >= 0) valueStatements.push(` childRate = ${inputSeason.childRate} `);
                if (inputSeason.infantRate !== false && inputSeason.infantRate >= 0) valueStatements.push(` infantRate = ${inputSeason.infantRate} `);
                if (inputSeason.familyRate !== false && inputSeason.familyRate >= 0) valueStatements.push(` familyRate = ${inputSeason.familyRate} `);
                if (inputSeason.additionalAdultRate !== false && inputSeason.additionalAdultRate >= 0) valueStatements.push(` additionalAdultRate = ${inputSeason.additionalAdultRate} `);
                if (inputSeason.additionalChildRate !== false && inputSeason.additionalChildRate >= 0) valueStatements.push(` additionalChildRate = ${inputSeason.additionalChildRate} `);
                if (inputSeason.seniorConcessionRate !== false && inputSeason.seniorConcessionRate >= 0) valueStatements.push(` seniorConcessionRate = ${inputSeason.seniorConcessionRate} `);

                sqls.push(`INSERT INTO price_seasons SET ${valueStatements.join(` , `)} , createdAt = NOW(), createdBy = ${userId} `);
            }

            if (sqls.length > 0) {
                let promises = [];
                sqls.map(query => {
                    promises.push(new Promise((resolve, reject) => {
                        db.get().execute(query, (err) => {
                            if (err) { reject(err); } else { resolve(); }
                        });
                    }));
                });

                Promise.all(promises).then(resolve).catch(reject);
            } else {
                resolve();
            }
        });
    });
};

module.exports = { list, get, getTypes, updateOrder, create, getSeasons, updateSeasons, update, restoreProduct, delete: deleteProduct,
    tourPricing, miscPricing, isAvailable, getTourTime };