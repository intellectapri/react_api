/**
 * Charges balance
 */

const db = require('./../../shared/db');

/**
 * Calculates the overall purchase balance
 * 
 * @param {Number} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */
const balance = (purchaseId) => {
    return new Promise((resolve, reject) => {
        if (parseInt(purchaseId) > 0) {
            let sql = `SELECT SUM(IF(type = 'payment', amount, amount * -1)) as balance
                FROM charge WHERE purchaseID = ${purchaseId} GROUP BY purchaseID`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else if (results.length === 1) {
                    let result = (results[0].balance ? parseFloat(results[0].balance) : 0);
                    resolve(result);
                } else {
                    resolve(0);
                }
            });
        } else {
            reject(`Invalid purchase identifier: ${purchaseId}`);
        }
    });
};

module.exports = { balance };