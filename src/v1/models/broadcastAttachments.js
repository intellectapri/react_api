/**
 * Broadcast attachments
 */

const utils = require('../shared/utils');
const db = require('./../shared/db');

/**
 * Adds attachment to the email
 * 
 * @param {Number} emailId Email identifier
 * @param {Object} data    File data
 * 
 * @returns {Promise}
 */
const add = (emailId, data) => {
    return Promise((resolve, reject) => {
        if (emailId > 0) {

            // @todo Save files in fs
            let fileName = ``;
            let originalName = ``;

            db.get().execute(`INSERT INTO st_broadcastemail_attachment (emailID,fileName,originalName)
            VALUES (${emailId},'${fileName}','${originalName}')`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve();
                }
            });
        } else {
            reject(`Invalid email identifier`);
        }
    });
};

/**
 * Removes attachment from the email
 * 
 * @param {Number} attachmentId Attachment identifier
 * 
 * @returns {Promise}
 */
const deleteAttachment = (attachmentId) => {
    return Promise((resolve, reject) => {
        if (attachmentId > 0) {

            // @todo Delete file from fs

            db.get().execute(`DELETE FROM st_broadcastemail_attachment WHERE attachmentID = ${attachmentId}')`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve();
                }
            });
        } else {
            reject(`Invalid email identifier`);
        }
    });
};

module.exports = { add, delete: deleteAttachment }