/**
 * Booking partners
 */

const Joi = require('joi');
const utils = require('./../shared/utils');
const db = require('./../shared/db');

const priceFields = [`adultPrice`, `childPrice`, `infantPrice`, `familyPrice`, `additionalAdultPrice`, `additionalChildPrice`, `seniorConcessionPrice`];

const getInvoiceOption = (customerId) => {
    return new Promise((resolve, reject) => {
        if (customerId && customerId > 0) {
            db.get().execute(`SELECT * FROM customer WHERE customerID = ${customerId} AND paymentMethod = 'invoice'`, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    if (results.length > 0) {
                        resolve(1);
                    } else {
                        resolve(0);
                    }
                }
            });
        } else {
            resolve(0);
        }
    });
};

const getWebsiteOption = (customerId) => {
    return new Promise((resolve, reject) => {
        if (customerId && customerId > 0) {
            db.get().execute(`SELECT * FROM customer WHERE customerID = ${customerId} AND paymentMethod = 'website'`, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    if (results.length > 0) {
                        resolve(1);
                    } else {
                        resolve(0);
                    }
                }
            });
        } else {
            resolve(0);
        }
    });
};


/**
 * Returns direct sale booking partner identifier
 * 
 * @returns {Promise}
 */
const getDirectSaleBookingPartnerId = () => {
    return new Promise((resolve, reject) => {
        db.get().execute(`SELECT * FROM customer WHERE myob = 'CASH'`, (err, results) => {
            if (err) {
                reject(err);
            } else {
                if (results.length === 1) {
                    resolve(results[0]["customerID"]);
                } else {
                    reject(utils.errors.NOT_FOUND);
                }
            }
        });
    });
};

/**
 * Booking partner information model
 */
const bookingPartnerSchema = Joi.object().keys({
    name: Joi.string().required(),
    paymentMethod: Joi.string().required(),
    contactFirstname: Joi.string().allow(''),
    contactLastname: Joi.string().allow(''),
    contactEmail: Joi.string().email().allow(''),
    address: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    postcode: Joi.string().allow(''),
    country: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    website: Joi.string().allow(''),
    emailConfirmation: Joi.string().allow(''),
    reservationConfirmEmail: Joi.string().email().allow(''),
    reservationPhone: Joi.string().allow(''),
    reservationEmail: Joi.string().email().allow(''),
    blackoutPhone: Joi.string().allow(''),
    commissionLevel: Joi.number().required(),
    adultPrice: Joi.number().precision(2).allow(''),
    childPrice: Joi.number().precision(2).allow(''),
    infantPrice: Joi.number().precision(2).allow(''),
    familyPrice: Joi.number().precision(2).allow(''),
    additionalAdultPrice: Joi.number().precision(2).allow(''),
    additionalChildPrice: Joi.number().precision(2).allow(''),
    seniorConcessionPrice: Joi.number().precision(2).allow(''),
}).unknown(true);

/**
 * Looks for the booking partner with specific identifier
 * 
 * @param {Number} id Booking partner identifier
 * 
 * @returns {Promise}
 */
const get = (id) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0) {
            db.get().execute(`SELECT * FROM customer WHERE archived IS NULL AND customerID = ${id}`, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    if (results.length === 1) {
                        let result = Object.assign({}, results[0]);                        
                        result.commissionLevel = (result.commissionLevel ? parseFloat(result.commissionLevel) : 0);
                        result.customerId = result.customerID;
                        delete result.customerID;

                        priceFields.map(item => {
                            if (!result[item]) result[item] = 0;
                        });

                        resolve(result);
                    } else {
                        reject(utils.errors.NOT_FOUND);
                    }
                }
            });
        } else {
            reject(`Invalid identifier`);
        }
    });
};

/**
 * Searches in booking partners according to provided filters
 * 
 * @param {Object} data Filters
 * 
 * @returns {Promise}
 */
const search = (data) => {
    return new Promise((resolve, reject) => {
        let { selectLimit, selectOffset, selectOrder } = utils.getPaginationSettings(data);

        let whereClauses = [];
        if (data.commissionLevel) whereClauses.push(` commissionLevel = ${utils.sanitize(data.commissionLevel)} `);
        [`name`, `reservationConfirmEmail`, `paymentMethod`].map(item => {
            if (item in data) {
                whereClauses.push(` ${item} LIKE '%${utils.sanitize(data[item])}%' `);
            }
        });

        let orderBy = (data.orderBy ? data.orderBy : `name`);
        let orderByClause = `ORDER BY ${orderBy} ${selectOrder}`;

        db.get().execute(`SELECT * FROM customer WHERE archived IS NULL ${(whereClauses.length > 0 ? ` AND ` + whereClauses.join( ` AND `) : ``)}
            ${orderByClause} LIMIT ${selectLimit} OFFSET ${selectOffset}`, (err, results) => {
                db.get().execute(`SELECT COUNT(*) as count FROM customer WHERE archived IS NULL ${(whereClauses.length > 0 ? ` AND ` + whereClauses.join( ` AND `) : ``)}`, (countErr, countResults) => {
                    if (countErr || err) {
                        reject(countErr ? countErr : err);
                    } else {
                        resolve({
                            total: countResults[0].count,
                            offset: selectOffset,
                            limit: selectLimit,
                            order: selectOrder,
                            orderBy,
                            data: results
                        });
                    }
                });
        });
    });
};

/**
 * Generates insert / update value clauses
 * 
 * @param {Object} data Booking partners information
 */
const generateValueClauses = (data) => {
    let stringFields = [`name`, `myob`, `contactFirstname`, `contactLastname`, `contactEmail`, `address`, `city`, `state`, `postcode`,
        `country`, `phone`, `fax`, `website`, `emailConfirmation`, `reservationConfirmEmail`, `reservationPhone`, `reservationEmail`,
        `blackoutPhone`, `blackoutEmail`, `paymentMethod`, `paymentDueTerm`, `layout`, `printedForm`, `customerNotes`];
    let numberFields = [`commissionLevel`, `balanceDueDays`].concat(priceFields);

    let setValueQueries = [];
    stringFields.map(item => {
        if (data[item]) {
            setValueQueries.push(` ${item} = '${utils.sanitize(data[item])}' `);
        }
    });

    numberFields.map(item => {
        if (data[item]) {
            setValueQueries.push(` ${item} = '${utils.sanitize(data[item])}' `);
        }
    });

    return setValueQueries;
};

/**
 * Create booking partner
 * 
 * @param {Object} data Booking partner information
 * 
 * @returns {Promise}
 */
const create = (data) => {
    return new Promise((resolve, reject) => {
        Joi.validate(data, bookingPartnerSchema).then(() => {
            let setValueQueries = generateValueClauses(data);
            if (setValueQueries.length > 0) {
                db.get().execute(`INSERT INTO customer SET ${setValueQueries.join(` , `)}`, (err, results) => {
                    if (err) {
                        reject(err.message);
                    } else if (results.insertId >= 0) {
                        resolve({ id: results.insertId });
                    } else {
                        reject('Unable to create charge');
                    }
                });
            } else {
                reject('No data to create booking partner from');
            }
        }).catch(error => {
            reject(error);
        });
    });
};

/**
 * Update booking partner
 * 
 * @param {Number} id   Booking partner identifier
 * @param {Object} data Booking partner information
 * 
 * @returns {Promise}
 */
const update = (id, data) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0) {
            Joi.validate(data, bookingPartnerSchema).then(() => {
                let setValueQueries = generateValueClauses(data);
                if (setValueQueries.length > 0) {
                    db.get().execute(`UPDATE customer SET ${setValueQueries.join(` , `)} WHERE customerID = ${id}`, (err, results) => {
                        if (err) {
                            reject(err.message);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    reject('No data to update booking partner from');
                }
            }).catch(error => {
                reject(error);
            });
        } else {
            reject(`Invalid identifier`);
        }
    });
};

/**
 * Delete booking partner
 * 
 * @param {Number} id Customer identifier
 * 
 * @returns {Promise}
 */
const deleteBookingPartner = (id) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0) {
            db.get().execute(`UPDATE customer SET archived = 1 WHERE customerID = ${id}`, (err) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve();
                }
            });
        } else {
            reject(utils.errors.NOT_FOUND);
        }
    });
};

/**
 * Return booking partner commission
 * 
 * @param {Number} id Booking partner identifier
 * 
 * @returns {Promise}
 */
const commission = (id) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0) {
            db.get().execute(`SELECT * FROM customer WHERE customerID = ${id}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else if (results.length === 1) {
                    let bookingPartner = results[0];
                    resolve({
                        commission: bookingPartner.commissionLevel,
                        email: bookingPartner.reservationConfirmEmail,
                        bookingRefID: (bookingPartner.paymentMethod === `invoice` ? 1 : 0),
                        customerNotes: bookingPartner.customerNotes
                    });
                } else {
                    reject(utils.errors.NOT_FOUND);
                }
            });
        } else {
            reject(`Invalid identifier`);
        }
    });
};

/**
 * Returns actual prices for specific booking partner
 * 
 * @param {Number} id Booking partner identifier
 * 
 * @returns {Promise}
 */
const getBookingPartnerOverrideValues = (id) => {
    return new Promise((resolve, reject) => {
        db.get().execute(`SELECT ${priceFields.join(`, `)} FROM customer WHERE customerID = ${parseInt(id)}`, (err, results) => {
            if (err) {
                reject(err.message);
            } else if (results.length === 1) {
                let atLeastOneValueIsNotEmpty = false;
                priceFields.map(item => {
                    if (results[0][item] && parseFloat(results[0][item]) > 0) {
                        atLeastOneValueIsNotEmpty = true;
                    }
                });

                if (atLeastOneValueIsNotEmpty) {
                    resolve(results[0]);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    });
};

module.exports = { getInvoiceOption, getWebsiteOption, getDirectSaleBookingPartnerId, get,
    search, create, update, delete: deleteBookingPartner, commission, getBookingPartnerOverrideValues };