/**
 * Email templates
 */

const Joi = require('joi');
const utils = require('./../shared/utils');
const db = require('./../shared/db');

const schema = Joi.object().keys({
    templateCode: Joi.string().required(),
    title: Joi.string().required(),
    standardText: Joi.string().allow(''),
    customerText: Joi.string().allow(''),
    tourOperatorText: Joi.string().allow(''),
    voucherText: Joi.string().allow(''),
    subject: Joi.string().required(),
    sendFrom: Joi.string().required(),
    originalFilename: Joi.string(),
    fileName: Joi.string(),
});

/**
 * Generates values clause
 * 
 * @param {Object} data Email template data
 * 
 * @returns {String}
 */
const generateValuesSQL = (data) => {
    return ` templateCode = '${utils.sanitize(data.templateCode)}',
        title = '${utils.sanitize(data.title)}',
        standardText = '${utils.sanitize(data.standardText)}',
        customerText = '${utils.sanitize(data.customerText)}',
        tourOperatorText = '${utils.sanitize(data.tourOperatorText)}',
        voucherText = '${utils.sanitize(data.voucherText)}',
        subject = '${utils.sanitize(data.subject)}',
        sendFrom = '${utils.sanitize(data.sendFrom)}',
        ${data.originalFilename ? " originalFilename = '" + data.originalFilename + "', " : ""}
        ${data.fileName ? " fileName = '" + data.fileName + "', " : ""} `
};

/**
 * Searches for templates according to provided code
 * 
 * @param {String} templateCode Template code
 * 
 * @returns {Promise}
 */
const findByTemplateCode = (templateCode) => {
    return new Promise((resolve, reject) => {
        db.get().execute(`SELECT * FROM st_emailtemplate WHERE templateCode = '${templateCode}'`, (err, results) => {
            if (err) {
                reject(err);
            } else if (results.length === 1) {
                resolve(results[0]);
            } else {
                reject(`Template with code ${templateCode} was not found`);
            }
        });
    });
};

/**
 * Searches for templates according to provided identifier
 * 
 * @param {Number} id Template identifier
 * 
 * @returns {Promise}
 */
const findByTemplateIdentifier = (id) => {
    return new Promise((resolve, reject) => {
        if (id > 0) {
            db.get().execute(`SELECT * FROM st_emailtemplate WHERE templateID = '${id}'`, (err, results) => {
                if (err) {
                    reject(err);
                } else if (results.length === 1) {
                    resolve(results[0]);
                } else {
                    reject(`Template with identifier ${id} was not found`);
                }
            });
        } else {
            reject(`Invalid identifier`);
        }
    });
};

/**
 * Return existing email templates
 * 
 * @returns {Promise}
 */
const list = (params) => {
    return new Promise((resolve, reject) => {
        let whereClause = `WHERE archived <> TRUE`;
        if (params && params.archived === `true`) {
            whereClause = ``;
        }

        db.get().execute(`SELECT * FROM st_emailtemplate ${whereClause} ORDER BY templateCode`, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

/**
 * Creates email template
 * 
 * @param {Object} data Email template information
 * 
 * @returns {Promise}
 */
const create = (data) => {
    return new Promise((resolve, reject) => {
        Joi.validate(data, schema).then(() => {
            db.get().execute(`INSERT INTO st_emailtemplate SET ${generateValuesSQL(data)} lastUpdated = NOW()`, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve({ id: results.insertId });
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

/**
 * Updates email template
 * 
 * @param {Number} id   Email template identifier
 * @param {Object} data Email template information
 * 
 * @returns {Promise}
 */
const update = (id, data) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0) {
            Joi.validate(data, schema).then(() => {
                db.get().execute(`UPDATE st_emailtemplate SET ${generateValuesSQL(data)} lastUpdated = NOW() WHERE templateID = ${id}`, (err) => {
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
            reject(`Invalid identifier`);
        }
    });
};

/**
 * Deletes email template
 * 
 * @param {Number} id Email template identifier
 * 
 * @returns {Promise}
 */
const deleteTemplate = (id, data) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0) {
            Joi.validate(data, schema).then(() => {
                db.get().execute(`UPDATE st_emailtemplate SET archived = TRUE WHERE templateID = ${id}`, (err) => {
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
            reject(`Invalid identifier`);
        }
    });
};

/**
 * Previews the template
 * 
 * @param {Number} id Email template identifier
 * 
 * @returns {Promise}
 */
const preview = (id) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0) {
            findByTemplateCode('EMAIL-HEADER').then(result => {
                let headerStr = result['standardText'];
                findByTemplateCode('EMAIL-FOOTER').then(result => {
                    let footerStr = result['standardText'];
                    findByTemplateCode(id).then(result => {
                        let body = result['standardText'];
                        resolve(headerStr + body + footerStr);
                    }).catch(reject);
                }).catch(reject);
            }).catch(reject);
        } else {
            reject(`Invalid identifier`);
        }
    });
};

module.exports = { list, update, deleteTemplate, preview, create, findByTemplateIdentifier };
