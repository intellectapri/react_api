/**
 * Tour booked information
 */

const Joi = require('joi');
const moment = require('moment');
const utils = require('./../../shared/utils');
const db = require('./../../shared/db');

/**
 * Returns number of booked tours on specific date
 * 
 * @param {Number} productId Product identifier
 * @param {String} date      Checked date
 * 
 * @return {Promise}
 */
const getBooked = (productId, date) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer().required(),
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required()
        });

        Joi.validate({ productId, date }, schema).then(() => {
            db.get().execute(`SELECT SUM(IF(family = 1, (noOfFamilyGroups * 4) + noOfAdditionals + noOfAddChildren, noOfAdult + noOfChildren)) as totalBook
            FROM  purchase_tour WHERE productID = ${productId} AND tourDate = '${date}' AND status = 'active'`, (err, results) => {
                if (err) {
                    reject(err);
                } else if (results.length > 0) {
                    resolve({ booked: parseInt(results[0].totalBook) });
                } else {
                    resolve({ booked: 0 })
                }
            });
        }).catch(reject);
    });
};

/**
 * Returns number of booked tours
 * 
 * @param {Number} productId Product identifier
 * @param {String} date      Checked date
 * @param {String} time      Time
 * @param {String} language  Language
 * 
 * @return {Promise}
 */
const getBookedByTime = (productId, date, time, language) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            productId: Joi.number().integer().required(),
            date: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            time: Joi.string().allow(``),
            language: Joi.string().allow(``)
        });

        Joi.validate({ productId, date, time, language }, schema).then(() => {
            let requestedDateDayOfWeek = moment(date, `YYYY-MM-DD`).format(`ddd`);
            db.get().execute(`SELECT
                SUM( IF(pt.family = 1, (pt.noOfFamilyGroups * 4) + pt.noOfAdditionals + pt.noOfAddChildren, pt.noOfAdult + pt.noOfChildren) ) AS totalBook
                FROM  purchase_tour pt
                LEFT JOIN (SELECT productID, availability${requestedDateDayOfWeek} AS productTime FROM product WHERE typeCode = 'TOURS' OR typeCode = 'PACKAGES') p
                ON p.productID = pt.productID
                WHERE
                    pt.productID = ${productId}
                    AND pt.tourDate = '${date}'
                    AND pt.status = 'active'
                    AND ${(language ? ` pt.language = '${language}' ` : ` pt.language IS NULL `)}  
                    AND ((p.productTime = '${time}' AND pt.overrideTourTime IS NULL) OR pt.overrideTourTime = '${time}')`, (err, results) => {
                if (err) {
                    reject(err);
                } else if (results.length > 0) {
                    resolve({ booked: parseInt(results[0].totalBook) });
                } else {
                    resolve({ booked: 0 })
                }
            });
        }).catch(reject);
    });
};

module.exports = { getBooked, getBookedByTime };