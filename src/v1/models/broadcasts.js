/**
 * Broadcasts
 */

var Joi = require('joi');
const utils = require('./../shared/utils');
const db = require('./../shared/db');

const broadcastUsers = require('./broadcastUsers');

/**
 * Searches for broadcast email
 * 
 * @param {Number} emailId Email identifier
 * 
 * @returns {Promise}
 */
const find = (emailId) => {
    return Promise((resolve, reject) => {
        if (emailId > 0) {
            db.get().execute(`SELECT * FROM st_broadcastemail WHERE emailID = ${emailId}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else if (results.length === 1) {
                    resolve(results[0]);
                } else {
                    resolve(false);
                }
            });
        } else {
            reject(`Invalid email identifier`);
        }
    });
};

/**
 * Searches for all broadcast emails
 * 
 * @returns {Promise}
 */
const findAll = (limit = 100) => {
    return Promise((resolve, reject) => {
        let sql = `SELECT be.*,
            unix_timestamp(be.sentDate) as unixsentdate,
            CONCAT(u1.firstname,' ',u1.lastname) as setupName,
            CONCAT(u2.firstname,' ',u2.lastname) as updateName,
            COUNT(bu.sendID) AS total
        FROM st_broadcastemail be
        INNER JOIN st_broadcastemail_user bu ON bu.emailID = be.emailID
        INNER JOIN user u1 ON be.setupUserID = u1.userID
        INNER JOIN user u2 ON be.updateUserID = u2.userID
        GROUP BY be.emailID
        ORDER BY be.emailID DESC ${limit > 0 ? ` LIMIT ` + limit : ``}`;
        db.get().execute(sql, (err, results) => {
            if (err) {
                reject(err.message);
            } else {
                resolve(results);
            }
        });
    });
};


/**
 * Searches for broadcast emails
 * 
 * @param {Object} data Search parameters
 * 
 * @returns {Promise}
 */
const search = (data) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            emailTo: Joi.string(),
            subject: Joi.string(),
            userId: Joi.number().integer(),
            travelagency: Joi.string(),
            limit: Joi.number().integer(),
            page: Joi.number().integer(),
            from: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            to: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
        });

        Joi.validate(data, schema).then(() => {
            let whereClauses = [];
            if (data.emailTo) whereClauses.push(` be.sendTo LIKE '%${utils.sanitize(data.emailTo)}%' `);
            if (data.subject) whereClauses.push(` be.subject LIKE '%${utils.sanitize(data.subject)}%' `);
            if (data.userId) whereClauses.push(` be.setupUserID = '${utils.sanitize(data.userId)}' `);

            whereClauses.push(` DATE_FORMAT(be.sentDate,'%Y-%m-%d') >= '${data.from}' `);
            whereClauses.push(` DATE_FORMAT(be.sentDate,'%Y-%m-%d') <= '${data.to}' `);

            let { selectLimit, selectOffset } = utils.getPaginationSettings(data);
            let limitOffsetQuery = ` LIMIT ${selectLimit} OFFSET ${selectOffset} `;

            let sqlTotal = `SELECT COUNT(*) as count FROM st_broadcastemail be
                LEFT JOIN st_broadcastemail_user bu ON bu.emailID = be.emailID
                LEFT JOIN customer c ON c.customerID = bu.customerID
                LEFT JOIN user u1 ON be.setupUserID = u1.userID
                LEFT JOIN user u2 ON be.updateUserID = u2.userID
                WHERE (be.sendTo != '' OR bu.emailTo != '') AND ${whereClauses.join(` AND `)}
                GROUP BY be.emailID ORDER BY be.emailID DESC`;

            let sqlData = `SELECT be.*, unix_timestamp(be.sentDate) as unixsentdate, pt.purchaseID,
                CONCAT(u1.firstname,' ',u1.lastname) as setupName, CONCAT(u2.firstname,' ',u2.lastname) as updateName,
                COUNT(bu.sendID) AS total
                FROM st_broadcastemail be
                LEFT JOIN st_broadcastemail_user bu ON bu.emailID = be.emailID
                LEFT JOIN customer c ON c.customerID = bu.customerID
                LEFT JOIN user u1 ON be.setupUserID = u1.userID
                LEFT JOIN user u2 ON be.updateUserID = u2.userID
                LEFT JOIN purchase_tour pt ON be.detailID = pt.detailID
                WHERE (be.sendTo != '' OR bu.emailTo != '') AND ${whereClauses.join(` AND `)}
                GROUP BY be.emailID ORDER BY be.emailID DESC ` + limitOffsetQuery;

            db.get().execute(sqlData, (err, results) => {
                    db.get().execute(sqlTotal, (countErr, countResults) => {
                        if (countErr || err) {
                            reject(countErr ? countErr : err);
                        } else {
                            resolve({
                                total: (countResults && countResults.length > 0 ? countResults.length : 0),
                                offset: selectOffset,
                                limit: selectLimit,
                                data: results
                            });
                        }
                    });
            });
        }).catch(error => {
            reject(error);
        });
    });
};

/**
 * Creates the email record in the database
 * 
 * @param {String} subject       Email subject
 * @param {String} message       Email body
 * @param {String} sendFrom      The send from address
 * @param {String} setupUserId   Setup user identifier
 * @param {String} updateUserId  Update user identifier
 * @param {String} internalNotes Internal notes
 * 
 * @returns {Promise}
 */
const createEmail = (subject, message, sendFrom, setupUserId, updateUserId, internalNotes) => {
    return new Promise((resolve, reject) => {
        let sql = `INSERT INTO st_broadcastemail SET 
            setupDate = NOW(),
            subject = '${utils.sanitize(subject)}',
            message = '${utils.sanitize(message)}',
            sendFrom = '${utils.sanitize(sendFrom)}',
            setupUserID = '${utils.sanitize(setupUserId)}',
            updateUserID = '${utils.sanitize(updateUserId)}',
            internalNotes = '${utils.sanitize(internalNotes)}'`;

        db.get().execute(sql, (err, results) => {
            if (err) {
                reject(err.message);
            } else if (results.insertId && results.insertId > 0) {
                resolve(results.insertId);
            } else {
                reject(`Unable to get the identifier of created email`);
            }
        });
    });
};


/**
 * Creates of updates broadcast email
 * 
 * @param {Number} emailId Email identifier
 * @param {Object} data    Email data
 */
const save = (emailId, data) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            sendFrom: Joi.string().required(),
            subject: Joi.string().required(),
            message: Joi.string().required(),
            internalNotes: Joi.string(),
            totalSent: Joi.number().integer(),
            setupDate: Joi.string(),
            setupUserID: Joi.number().integer()
        });

        Joi.validate(data, schema).then(() => {
            let sql = `sendFrom = '${utils.sanitize(data["sendFrom"])}', subject = '${utils.sanitize(data["subject"])}',
                message = '${utils.sanitize(data["message"])}', internalNotes = '${utils.sanitize(data["internalNotes"])}',
                updateUserID = '1'`;

            if (emailId === 0) {
                sql = `INSERT INTO st_broadcastemail SET ${sql}, setupDate = '${utils.sanitize(data["setupDate"])}',
                    totalSent = '${utils.sanitize(data["totalSent"])}' , setupUserID = '${utils.sanitize(data["setupUserID"])}'`
            } else {
                sql = `UPDATE st_broadcastemail SET ${sql} WHERE emailID = ${emailId}`;
            }

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else if (results.insertId && results.insertId > 0) {
                    resolve(results.insertId);
                } else {
                    resolve();
                }
            });
        }).catch(reject);
    });
};

/**
 * Creates new broadcast email
 * 
 * @param {Object} data   Broadcast email data
 * @param {Number} userId User identifier
 * 
 * @returns {Promise}
 */
const create = (data, userId) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            templateCode: Joi.string(),
            templateCode2: Joi.string(),
            subject: Joi.string().required(),
            body: Joi.string().required(),
            internalNotes: Joi.string(),
        });

        const addslashes = (string) => {
            return string.replace(/\\/g, '\\\\').
                replace(/\u0008/g, '\\b').
                replace(/\t/g, '\\t').
                replace(/\n/g, '\\n').
                replace(/\f/g, '\\f').
                replace(/\r/g, '\\r').
                replace(/'/g, '\\\'').
                replace(/"/g, '\\"');
        };

        Joi.validate(data, schema).then(() => {
            emails.getFrom().then(sendFrom => {
                const proceedWithSending = (body) => {
                    createEmail(data.subject, body, sendFrom, userId, userId, data.internalNotes).then(({ id }) => {
                        broadcastUsers.save(id, userId).then(resolve).catch(reject);
                    });
                };

                if (data.templateCode) {
                    emailTemplates.findByTemplateCode(data.templateCode).then(emailTresultemplate => {
                        let body = addslashes(result[`customerText`]);
                        proceedWithSending(body);
                    });
                } else if (data.templateCode2) {
                    find(data.templateCode2).then(result => {
                        let body = addslashes(result[`message`]);
                        proceedWithSending(body);
                    });
                } else {
                    reject(`No templateCode provided`);
                }
            }).catch(reject);
        }).catch(reject);
    });
};


/**
 * Updates the broadcast email
 * 
 * @param {Number} emailId Email identifier
 * @param {Object} data    Email information
 * 
 * @returns {Promise}
 */
const update = (emailId, data, userId) => {
    return Promise((resolve, reject) => {
        if (emailId > 0) {
            const schema = Joi.object().keys({
                sendFrom: Joi.string().required(),
                subject: Joi.string().required(),
                message: Joi.string().required(),
                internalNotes: Joi.string().required(),
            });
    
            Joi.validate(data, schema).then(() => {
                let sql = `UPDATE st_broadcastemail SET
                    sendFrom = '${utils.sanitize(data.sendFrom)}',
                    subject = '${utils.sanitize(data.subject)}',
                    message = '${utils.sanitize(data.message)}',
                    internalNotes = '${utils.sanitize(data.internalNotes)}',
                    updateUserID = '${userId}'
                    WHERE emailID = ${emailId}`;

                db.get().execute(sql, (err) => {
                    if (err) {
                        reject(err.message);
                    } else {
                        resolve();
                    }
                });
            }).catch(reject);
        } else {
            reject(`Invalid email identifier`);
        }
    });
};

/**
 * Deletes the broadcast email
 * 
 * @param {Number} emailId Email identifier
 * 
 * @returns {Promise}
 */
const deleteEmail = (emailId) => {
    return Promise((resolve, reject) => {
        if (emailId > 0) {
            db.get().execute(`DELETE FROM st_broadcastemail where emailID = ${emailId}`, (err) => {
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
 * Updates the email send status
 * 
 * @param {Number} emailId   Email identifier
 * @param {Number} totalSent Total sent emails
 * 
 * @returns {Promise}
 */
const send = (emailId, totalSent) => {
    return new Promise((resolve, reject) => {
        if (emailId > 0) {
            db.get().execute(`UPDATE st_broadcastemail SET sentDate = NOW(), totalSent = ${totalSent}
                WHERE emailID = ${emailId}`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else if (results.length === 1) {
                    resolve(results[0]);
                } else {
                    resolve(false);
                }
            });
        } else {
            reject(`Invalid email identifier`);
        }
    });
};

/**
 * Adds broadcast email
 * 
 * @param {String} subject      Email subject
 * @param {String} message      Email message
 * @param {String} sendFrom     Send from field
 * @param {String} setupUserId  Created user identifier
 * @param {String} updateUserID Updated user identifier
 * @param {Number} detailId     Detail identifier
 * @param {String} to           To field
 * 
 * @return {Promise}
 */
const add = (subject, message, sendFrom, setupUserId, updateUserId, detailId, to) => {
    return new Promise((resolve, reject) => {
        if (subject && message && sendFrom && setupUserId && updateUserId && detailId && to) {
            let sql = `INSERT INTO st_broadcastemail SET 
            setupDate = NOW(),
            sentDate = NOW(),
            totalSent = 1,
            subject = '${utils.sanitize(subject)}',
            message = '${utils.sanitize(message)}',
            sendFrom = '${utils.sanitize(sendFrom)}',				
            setupUserID = '${utils.sanitize(setupUserId)}',
            updateUserID = '${utils.sanitize(updateUserId)}',
            detailID = ${utils.sanitize(detailId)},			
            sendTo = '${utils.sanitize(to)}'`;

        db.get().execute(sql, (err, results) => {
            if (err) {
                reject(err.message);
            } else {
                resolve(results.insertId);
            }
        });
        } else {
            reject(`Invalid parameters provided when adding broadcast`);
        }
    });
};

module.exports = { search, create, update, delete: deleteEmail, send, add };