/**
 * Tour purchases lookup
 */

const Joi = require('joi');
const moment = require('moment');
const utils = require('./../../shared/utils');
const tourBooked = require('./tour.booked');
const db = require('./../../shared/db');

/**
 * Searches for tour purchase
 * 
 * @param {Number} detailId Tour purchase identifier
 * 
 * @returns {Promise}
 */
const find = (detailId) => {
    return new Promise((resolve, reject) => {
        if (detailId > 0) {
            let sql = `SELECT pt.*,
                p.purchaseDate,	p.customerID, p.travelerFirstname, p.travelerLastname, p.additionalNames, p.email,
                p.phone, p.hotel, p.revenueAccNo, p.invoice, p.invoiceDate, p.taxInc, p.taxCode, p.internalNotes,
                p.enteredBy, p.myobImport,
                c.name AS customerName, c.reservationConfirmEmail, c.commissionLevel, c.customerNotes,
                prod.tourOperatorEmail, prod.templateCode, prod.name AS productName,
                prod.availabilityMon, prod.availabilityTue, prod.availabilityWed, prod.availabilityThu,
                prod.availabilityFri, prod.availabilitySat, prod.availabilitySun, prod.templateCode AS emailTemplate,
                prod.tourTime AS prod_tourTime,
                IF(family = 0, noOfAdult + noOfChildren, noOfFamilyGroups * 4 + noOfAdditionals + noOfAddChildren) as totalRiders
                FROM purchase_tour pt
                INNER JOIN purchase p ON p.purchaseID = pt.purchaseID
                INNER JOIN product prod ON prod.productID = pt.productID
                LEFT JOIN customer c ON c.customerID = p.customerID
                WHERE pt.detailID = ${detailId}`;

                db.get().execute(sql, (err, results) => {
                    if (err) {
                        reject(err);
                    } else if (results.length === 1) {
                        let result = results[0];
                        result.productId = result.productID;
                        result.purchaseId = result.purchaseID;
                        result.detailId = result.detailID;
                        resolve(result);
                    } else {
                        resolve(false);
                    }
                });
        } else {
            reject(`Invalid purchaseId`);
        }
    });
};

const findByPurchaseId = (id) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0) {
            let sql = `SELECT pt.*, p.purchaseDate,	p.customerID, p.travelerFirstname, p.travelerLastname, p.additionalNames, p.email,
                p.phone, p.hotel, p.revenueAccNo, p.invoice, p.invoiceDate, p.taxInc, p.taxCode, p.internalNotes, p.enteredBy,
                prod.name AS productName
                FROM purchase_tour pt				
                INNER JOIN purchase p ON p.purchaseID = pt.purchaseID
                INNER JOIN product prod ON prod.productID = pt.productID
                WHERE pt.purchaseID = ${id}`;

            db.get().execute(sql, (err, results) => {
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
            reject(`Invalid purchaseId`);
        }
    });
};

/**
 * Searches for booking for specific date
 * 
 * @param {String} date Searched date
 * @param {String} city Searched city
 * 
 * @returns {Promise}
 */
const findBookingByDate = (date, city) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            city: Joi.string().regex(utils.CITIES_CHECK_REGEXP),
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required()
        });

        Joi.validate({ date, city }, schema).then(() => {
            let sql = `SELECT prod.name AS productName, pt.tourDate, SUM(IF(pt.family = 0, pt.noOfAdult + pt.noOfChildren, pt.noOfFamilyGroups * 4 + pt.noOfAdditionals + noOfAddChildren)) AS totalGuest, a.total AS totalAllotment
                FROM purchase_tour pt
                INNER JOIN product prod ON prod.productID = pt.productID
                INNER JOIN allotment a ON a.productID = pt.productID AND a.allotmentDate = pt.tourDate
                WHERE DATE_FORMAT(pt.tourDate,'%Y-%m-%d') = '${date}'				
                AND pt.status = 'active' ${ city ? ` AND prod.city = '${city}' ` : `` }
                GROUP BY prod.productID`;

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

const findOverallPurchase = (id) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0) {
            let sql = `SELECT * FROM purchase WHERE purchaseID = ${id}`;
            db.get().execute(sql, (err, results) => {
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
            reject(`Invalid purchaseId`);
        }
    });
};

/**
 * Searches for bookings with 2 weeks interval
 * 
 * @param {String} date Start date
 * 
 * @returns {Promise}
 */
const findFutureBookings = (date) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required()
        });

        Joi.validate({ date }, schema).then(() => {
            let sql = `SELECT pt.*, p.travelerLastname, p.phone, p.hotel, p.additionalNames, p.internalNotes,
				prod.name AS productName, SUM(IF(c.type = 'payment',c.amount,-1*c.amount)) AS totalPaid, cust.myob
				FROM purchase_tour pt
				INNER JOIN purchase p ON p.purchaseID = pt.purchaseID
				INNER JOIN product prod ON prod.productID = pt.productID
				LEFT JOIN customer cust ON cust.customerID = p.customerID
				LEFT JOIN charge c ON c.purchaseID = pt.purchaseID
				WHERE DATE_FORMAT(pt.tourDate, '%Y-%m-%d') > '${date}'
				AND DATE_FORMAT(pt.tourDate, '%Y-%m-%d') <=  DATE_ADD('${date}', INTERVAL 2 WEEK)
				AND pt.status = 'active' GROUP BY p.purchaseID`;

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
 * Searches for all purchaes by their checkin
 * 
 * @param {String} date Start date
 * @param {String} city City
 * 
 * @returns {Promise}
 */
const findAllByCheckIn = (date, city) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            city: Joi.string().allow(``)
        });

        Joi.validate({ date, city }, schema).then(() => {
            let requestedDateDayOfWeek = moment(date, `YYYY-MM-DD`).format(`ddd`);
            let whereClauses = [];
            whereClauses.push(` pt.tourDate = '${utils.sanitize(date)}' `);
            if (city && city.length > 0) whereClauses.push(` p.purchaseCity = '${utils.sanitize(city)}' `);
            let sql = `SELECT CONCAT(u.firstname, ' ', u.lastname) as enteredByName, prodData.name, pt.*, p.*, c.myob, c.customerNotes, c.name as customerName, SUM(IF(ch.type = 'payment',ch.amount,ch.amount*-1)) as totalPaid,
                IF(overrideTourTime IS NOT NULL, overrideTourTime, prod.productTime) AS tourTime
				FROM purchase_tour pt
				INNER JOIN purchase p ON p.purchaseID = pt.purchaseID
				LEFT JOIN customer c ON c.customerID = p.customerID
                LEFT JOIN charge ch ON ch.purchaseID = pt.purchaseID
                LEFT JOIN user u ON u.userID = p.enteredBy
                LEFT JOIN product prodData ON prodData.productID = pt.productID
				LEFT JOIN (SELECT name, productID, availability${requestedDateDayOfWeek} AS productTime FROM product WHERE typeCode = 'TOURS' OR typeCode = 'PACKAGES') prod
				ON prod.productID = pt.productID
				WHERE pt.status = 'active' AND ${whereClauses.join(` AND `)}
				GROUP BY p.purchaseID
                ORDER BY pt.tourDate, pt.productID, tourTime, pt.language`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    let distinctProducts = [];
                    let distinctPurchases = [];
                    results.map(purchase => {
                        if (distinctProducts.indexOf(purchase.productID) === -1) distinctProducts.push(purchase.productID);
                        if (distinctPurchases.indexOf(purchase.purchaseID) === -1) distinctPurchases.push(purchase.purchaseID);
                    });

                    let booked = {};
                    let promises = [];
                    
                    distinctProducts.map(productId => {
                        booked[`product_` + productId] = { totalBooked: 0, times: {} };

                        // Getting number of booked overall for specific product at specific date
                        promises.push(new Promise((resolve, reject) => {
                            tourBooked.getBooked(productId, date).then(bookedResult => {
                                booked[`product_` + productId].totalBooked = bookedResult.booked;
                                resolve();
                            }).catch(reject);
                        }));

                        results.map((purchase, index) => {
                            if (!purchase.tourTime) results[index].tourTime = `not_defined`;
                            if (!purchase.language) results[index].language = `not_defined`;
                        });

                        let times = {};
                        results.map(purchase => {
                            if (purchase.productID === productId) {
                                if (purchase.tourTime && purchase.language) {
                                    if (purchase.tourTime in times === false) times[purchase.tourTime] = {};
                                    if (purchase.language in times[purchase.tourTime] === false) times[purchase.tourTime][purchase.language] = [];
                                    times[purchase.tourTime][purchase.language].push(purchase.purchaseID);
                                }
                            }
                        });

                        booked[`product_` + productId].times = times;
                    });

                    distinctPurchases.map(purchaseID => {
                        promises.push(new Promise((resolve, reject) => {
                            db.get().execute(`SELECT * FROM purchase_misc WHERE purchaseID = ${purchaseID}`, (err, subresults) => {
                                if (err) { reject(err.message); return; }
                                let resultStr = [];
                                subresults.map(item => {
                                    resultStr.push(`${item.productID}:${item.qty}`);
                                });

                                results.map((item, index) => {
                                    if (item.purchaseID === purchaseID) {
                                        results[index].miscPurchases = (resultStr.length > 0 ? resultStr.join(`,`) : ``);
                                    }
                                });

                                resolve();
                            });
                        }));
                    });

                    Promise.all(promises).then(() => {
                        resolve({
                            booked,
                            purchases: results   
                        });
                    }).catch(error => reject(error));
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

module.exports = { find, findByPurchaseId, findBookingByDate, findOverallPurchase, findFutureBookings, findAllByCheckIn };
