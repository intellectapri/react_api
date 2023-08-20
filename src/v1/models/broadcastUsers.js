/**
 * Broadcast users
 */

const db = require('./../shared/db');

/**
 * Saves the broadcast user
 * 
 * @param {Number} emailId Email identifier
 * @param {Number} userId  User identifier
 * 
 * @returns {Promise}
 */
const save = (emailId, userId) => {
    return new Promise((resolve, reject) => {
        if (emailId > 0 && userId > 0) {
            db.get().execute(`INSERT INTO st_broadcastemail_user (emailID,customerID)
                SELECT ${emailId}, customerID FROM st_search_shortlist
                WHERE userID = ${userId}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve();
                }
            });
        } else {
            reject(`Invalid data`);
        }
    });
};

/**
 * Searches for broadcast users for specific email
 * 
 * @param {Number} emailId Email identifier
 * 
 * @returns {Promise}
 */
const findAllByEmailId = (emailId) => {
    return new Promise((resolve, reject) => {
        if (emailId) {
            db.get().execute(`SELECT DISTINCT * FROM st_broadcastemail_user bu
            INNER JOIN customer c ON c.customerID = bu.customerID WHERE bu.emailID = ${emailId}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve(results);
                }
            });
        } else {
            reject(`Invalid data`);
        }
    });
};

module.exports = { save, findAllByEmailId };