/**
 * Allotments
 */

const Joi = require('joi');
const moment = require('moment');
const utils = require('./../shared/utils');
const db = require('./../shared/db');

const tourPurchases = require('./purchases/tour.booked');
const products = require('./products');

const DAYS_OF_WEEK = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const getDates = (start, end, day) => {
    let localStartDate = moment(start, `YYYY-MM-DD`);
    let localEndDate = moment(end, `YYYY-MM-DD`);

    let dowDate = new Date(start);
    let dow = dowDate.getDay();

    let days = [];
    let diff = (dow <= day ? (day - dow) : (day - dow + 7));

    let pt = moment(localStartDate).add(diff, `d`).toDate();
    while (pt.getTime() <= localEndDate.toDate().getTime()) {
        days.push(moment(pt).format(`YYYY-MM-DD`));
        pt = moment(pt).add(1, `w`).toDate();
    }

    return days;
};

/**
 * Lists events sorted by dates in specific time range
 * 
 * @param {Object} data Search parameters
 * 
 * @returns {Promise}
 */
const events = (data) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer().required(),
            range: Joi.string().regex(/^\d+:\d+$/).required(),
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP)
        });

        Joi.validate(data, schema).then(() => {
            products.get(data.productId).then(product => {
                if (product) {
                    if (product['typeCode'] != 'TOURS' && product['typeCode'] != 'PACKAGES' && product['typeCode'] != 'HIRES') {
                        resolve({});
                    } else {
                        search(data).then(allotments => {
                            if (allotments.length > 0) {
                                let data = {};
                                allotments.map(allotment => {
                                    let allotmentDate = new Date(allotment.allotmentDate);
                                    let year = allotmentDate.getFullYear();
                                    let month = allotmentDate.getMonth();
                                    let day = allotmentDate.getDate();
                                    if (year in data === false) data[year] = {};
                                    if ((month + 1) in data[year] === false) data[year][month + 1] = {};

                                    let totalBook = (allotment["totalBook"] ? parseInt(allotment["totalBook"]) : 0);
                                    let total = parseInt(allotment.total);
                                    data[year][month + 1][day] = {
                                        text: `${totalBook} / ${allotment.total}`,
                                        available: (total - totalBook),
                                        total
                                    };
                                });

                                resolve(data);
                            } else {
                                resolve({});
                            }
                        }).catch(reject);
                    }
                } else {
                    reject(`Product with identifier ${data.productId} was not found`);
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

/**
 * Searches allotments
 * 
 * @param {Object} data Search parameters
 * 
 * @returns {Promise}
 */
const search = (data) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer().required(),
            range: Joi.string().regex(/^\d+:\d+$/).required(),
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP)
        });

        Joi.validate(data, schema).then(() => {
            let explodedString = data.range.split(`:`);

            let countingFrom = `NOW()`;
            if (data.date) {
                countingFrom = `STR_TO_DATE('${data.date}', '%Y-%m-%d')`;
            }

            let allotmentsSearchRangeSQL = `AND a.allotmentDate <= DATE_ADD(${countingFrom}, INTERVAL ${explodedString[1]} MONTH) AND a.allotmentDate >= DATE_SUB(${countingFrom}, INTERVAL ${explodedString[0]} MONTH)`;

            let sql = `SELECT a.*, p.name AS productName, 
                p.city, p.availabilityMon, p.availabilityTue, p.availabilityWed, p.availabilityThu, p.availabilityFri, p.availabilitySat, p.availabilitySun,
                SUM(IF(pt.family = 0, pt.noOfAdult + pt.noOfChildren, (pt.noOfFamilyGroups * 4) + pt.noOfAdditionals + pt.noOfAddChildren)) as totalBook                
                FROM allotment a
                INNER JOIN product p ON p.productID = a.productID
                LEFT JOIN purchase_tour pt ON pt.productID = a.productID AND pt.tourDate = a.allotmentDate AND pt.status = 'active'
                WHERE a.productID = ${data.productId} AND a.total != 0
                ${allotmentsSearchRangeSQL}
                GROUP BY a.allotmentID                    
                ORDER BY a.allotmentDate ASC`;

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
 * Find all allotments for specific date
 * 
 * @param {Number} productId Product identifier
 * @param {String} date      Allotment date
 * 
 * @returns {Promise}
 */
const findAllByDate = (productId, date) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer().required(),
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
        });

        Joi.validate({ productId, date }, schema).then(() => {
            let sql = `SELECT a.*, p.name AS productName, p.city, p.availabilityMon, p.availabilityTue,
                p.availabilityWed, p.availabilityThu, p.availabilityFri, p.availabilitySat, p.availabilitySun
                FROM allotment a
                INNER JOIN product p ON p.productID = a.productID
                WHERE a.productID = ${productId}
                AND a.allotmentDate = '${date}'`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err);
                } else if (results.length > 0) {
                    resolve(results[0]);
                } else {
                    resolve(false);
                }
            });
        }).catch(reject);
    });
};


/**
 * Saves or updates the allotment
 * 
 * @param {Number} productId Product identifier
 * @param {String} date      Allotment date
 * @param {Number} total     Total number of allotments data
 * 
 * @returns {Promise}
 */
const save = (productId, date, total) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer().required(),
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            total: Joi.number().integer().required(),
        });

        Joi.validate({ productId, date, total }, schema).then(() => {
            let sql = ` productID = ${productId}, allotmentDate = '${date}', total = ${total} `;
            findAllByDate(productId, date).then(allotment => {
                if (allotment) {
                    sql = `UPDATE allotment SET ${sql} WHERE allotmentID = ${allotment.allotmentID}`;
                } else {
                    sql = `INSERT INTO allotment SET ${sql}`;
                }

                db.get().execute(sql, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }).catch(reject);
        }).catch(reject);
    });
};

/**
 * Create or update allotment
 * 
 * @param {Object} data Allotment data
 * 
 * @returns {Promise}
 */
const createOrUpdate = (data) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer().required(),
            startDate: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            endDate: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            allotmentDay: Joi.string().required(),
            override: Joi.number().integer().required(),
            total: Joi.number().integer().required(),
        });

        Joi.validate(data, schema).then(() => {
            let promises = [];
            let allotmentDaySplit = data.allotmentDay.split(`,`);
            allotmentDaySplit.map(day => {
                let days = getDates(data.startDate, data.endDate, DAYS_OF_WEEK[day]);
                if (products.isAvailable(data.productId, day) || parseInt(data.override) === 1) {
                    days.map(day => {
                        promises.push(save(data.productId, day, data.total));
                    });
                }
            });

            Promise.all(promises).then(() => {
                resolve();
            }).catch(error => {
                console.log(error);
                reject();
            });
        }).catch(reject);
    });
};

/**
 * Checks availability for specific date
 * 
 * @param {Object} data Allotment data
 * 
 * @returns {Promise}
 */
const available = (data) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer().required(),
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            purchaseId: Joi.number().integer(),
        });

        Joi.validate(data, schema).then(() => {
            if (!data.purchaseId) data.purchaseId = 0;

            let sql = `SELECT a.total, SUM(IF(tp.family = 0, tp.noOfAdult + tp.noOfChildren, tp.noOfFamilyGroups * 4 + tp.noOfAdditionals + tp.noOfAddChildren)) AS totalGuest
                FROM allotment a
                LEFT JOIN purchase_tour tp ON tp.tourDate = a.allotmentDate AND tp.productID = a.productID AND tp.status = 'active' AND tp.purchaseID != ${data.purchaseId}
            WHERE a.productID = ${data.productId}
            AND a.allotmentDate = '${data.date}'
            GROUP BY a.allotmentID`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    if (results.length > 0) {
                        let result = results[0];
                        let allotment = (result[`total`] !== `` ? parseInt(result[`total`]) : 0);
                        let booked = (result[`totalGuest`] ? parseInt(result[`totalGuest`]) : 0);
                        resolve(allotment - booked);
                    } else {
                        resolve(0);
                    }
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

/**
 * Checks overbooked state
 * 
 * @param {Object} data Allotment data
 * 
 * @returns {Promise}
 */
const overbooked = (data) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer().required(),
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            startDate: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            endDate: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            allotmentDay: Joi.string().required(),
            total: Joi.number().integer().required(),
        });

        Joi.validate(data, schema).then(() => {
            let allotmentDays = data.allotmentDay.split(`,`);
            allotmentDays.map(item => {
                let results = [];
                let days = getDates(data.startDate, data.endDate, DAYS_OF_WEEK[item]);
                days.map(day => {
                    let promises = [];
                    promises.push(tourPurchases.getBooked(data.productId, day).then(result => {
                        if (parseInt(result.booked) > parseInt(data.total)) {
                            results.push({
                                date: data.date,
                                booked: parseInt(result.booked)
                            });
                        }
                    }));
        
                    Promise.all(promises).then(() => {
                        resolve(results);
                    }).catch(error => {
                        console.log(error);
                        reject();
                    });
                });
            });
        }).catch(error => {
            reject(error);
        });
    });
};

module.exports = { search, createOrUpdate, available, overbooked, events };