/**
 * Emails
 */

const db = require('./../shared/db');

/**
 * Returns default "From" email
 * 
 * @returns {Promise}
 */
const getFrom = () => {
    return new Promise((resolve, reject) => {
        db.get().execute(`SELECT * FROM st_setting WHERE settingID = 'DEFAULT_EMAIL'`, (err, results) => {
            if (err) {
                reject(err.message);
            } else if (results.length === 1) {
                resolve(results[0].settingValue);
            } else {
                reject(`Unable to get default From email address`)
            }
        });
    });
}

module.exports = { getFrom };