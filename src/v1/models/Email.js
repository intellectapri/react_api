
/**
 * Email class
 */

const nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');

const db = require('./../shared/db');
const broadcasts = require('./broadcasts');

class Email {
    constructor(templateCode) {
        this.template = (templateCode ? templateCode : `DEFAULT`);
        this.to = [];
        this.cc = [];
        this.from = ``;
        this.variables = [];
        this.subject = ``;
        this.body = ``;
        this.fromname = ``;
        this.attachments = [];
        this.texttype = `standard`;
    }

    /**
     * Searches for template by its name
     * 
     * @param {String} templateName Template name
     * 
     * @returns {Promise}
     */
    find(templateName) {
        return new Promise((resolve, reject) => {
            if (templateName) {
                let sql = `SELECT * FROM st_emailtemplate WHERE templateCode = '${templateName}'`;
                db.get().execute(sql, (err, results) => {
                    if (err) {
                        reject(err.message);
                    } else if (results.length > 0) {
                        resolve(results[0]);
                    } else {
                        resolve(false);
                    }
                });
            } else {
                reject(`Invalid template name`)
            }
        });
    }

    /**
     * Return default "from" email field
     * 
     * @returns {Promise}
     */
    getFrom() {
        return new Promise((resolve, reject) => {
            let sql = `SELECT * FROM st_setting WHERE settingID = 'DEFAULT_EMAIL'`;
            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else if (results.length > 0) {
                    resolve(results[0]['settingValue']);
                } else {
                    reject(`Unable to find default "from" setting`);
                }
            });
        });
    }

    /**
     * Return default "body" email field
     * 
     * @param {String} template Template name
     * 
     * @returns {Promise}
     */
    getBody(template) {
        return new Promise((resolve, reject) => {
            let sql = `SELECT * FROM st_emailtemplate WHERE templateCode = '${template}'`;
            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else if (results.length > 0) {
                    if (template === 'EMAIL-HEADER' || template === 'EMAIL-FOOTER') {
                        resolve(results[0]['standardText']);
                    } else {
                        if (results[0][this.texttype + 'Text']) {
                            resolve(results[0][this.texttype + 'Text']);
                        } else {
                            reject(`Template ${template} exists, but unable to get ${this.texttype + 'Text'} body`);
                        }
                    }
                } else {
                    resolve(``);
                }
            });
        });
    }

    addTo(address, name) {
        if (!address || !name) throw new Error(`Invalid To field (${address}, ${name})`);
        this.to.push({ address, name });
    }

    addCC(address, name) {
        if (!address || !name) throw new Error(`Invalid CC field (${address}, ${name})`);
        this.cc.push({ address, name });
    }

    addAttachment(path, filename) {
        // @todo Check if file exists
        this.attachments.push({ path, filename });
    }

    addVariable(key, value, removeLineIfEmpty = false) {
        if (!key || value === undefined) throw new Error(`Invalid variable field (${key}, ${value})`);
        this.variables[key] = { value, removeLineIfEmpty };
    }

    fetchAttachment(path) {
        return new Promise((resolve, reject) => {
            this.find(this.template).then(email => {
                this.addAttachment(path + email.filename, email.filename);
                resolve();
            }).catch(reject);
        });
    }

    parseContent(content) {
        if (!content) throw new Error(`Empty content was provided (${content})`);

        for (let key in this.variables) {
            if (this.variables[key].removeLineIfEmpty && !this.variables[key].value) {
                let splitContent = content.split(key);
                for (var i = 1; i < splitContent.length; i++) {
                    if (splitContent[i - 1].lastIndexOf(`<p>`) > splitContent[i - 1].lastIndexOf(`<div>`)) {
                        splitContent[i - 1] = splitContent[i - 1].substring(0, splitContent[i - 1].lastIndexOf(`<p>`));
                        splitContent[1] = splitContent[i].substring(splitContent[i].indexOf(`</p>`) + 4);
                    } else {
                        splitContent[i - 1] = splitContent[i - 1].substring(0, splitContent[i - 1].lastIndexOf(`<div>`));
                        splitContent[1] = splitContent[i].substring(splitContent[i].indexOf(`</div>`) + 6);
                    }
                }

                content = splitContent.join(``);
            } else {
                content = content.split(key).join(this.variables[key].value);
            }
        }

        return content;
    }

    setSubject(value) {
        if (!value) throw new Error(`Invalid Subject field (${value})`);
        this.subject = value;
    }

    setBody(value) {
        if (!value) throw new Error(`Invalid Body field (${value})`);
        this.body = value;
    }

    setFrom(value) {
        if (!value) throw new Error(`Invalid From field (${value})`);
        this.from = value;
    }

    setFromname(value) {
        if (!value) throw new Error(`Invalid Fromname field (${value})`);
        this.fromname = value;
    }

    setTexttype(value) {
        if ([`standard`, `voucher`, `customer`, `tourOperator`].indexOf(value) === -1) {
            throw new Error(`Invalid textType value for email: ${value}`);
        } else {
            this.texttype = value;
        }
    }

    /**
     * Saves email as the broadcast
     * 
     * @param {Number} userId   Sender identifier
     * @param {Number} detailId Detail identifier
     * 
     * @returns {Promise}
     */
    save(userId, detailId) {
        return new Promise((resolve, reject) => {
            broadcasts.add(this.subject, this.body, this.from, userId, userId, detailId, this.to[0].address).then(emailId => {
                broadcasts.send(emailId, 1).then(resolve);
            }).catch(reject);
        });
    }

    /**
     * Checks email for correctness
     * 
     * @returns {Promise}
     */
    check() {
        return new Promise((resolve, reject) => {
            reject();
        });
    }

    /**
     * Sends the email
     * 
     * @returns {Promise}
     */
    send() {
        return new Promise((resolve, reject) => {
            this.find(this.template).then(einfo => {
                this.getBody(`EMAIL-HEADER`).then(header =>{
                    this.getBody(`EMAIL-FOOTER`).then(footer =>{
                        this.getBody(this.template).then(templateBody => {
                            if (!templateBody) {
                                reject(`Unable to get template body for template ${this.template}`);
                            } else {
                                this.getFrom().then(defaultFrom => {
                                    let from = (this.from ? this.from : defaultFrom);
                                    let fromname = (!this.fromname ? einfo['sendFrom'] : this.fromname);
                                    let subject = this.parseContent(this.subject ?  this.subject : einfo['subject']);
                                    let html = header + (this.parseContent(templateBody)) + footer;

                                    this.from = `"${fromname}" <${from}>`;
                                    this.subject = subject;
                                    this.body = html;

                                    let transporter = false;

                                    // Using SendGrid
                                    // var options = {
                                    //     auth: {
                                    //         api_user: process.env.SMTP_USER,
                                    //         api_key: process.env.SMTP_PASSWORD,

                                    //     }
                                    // }
                                    var options = {
                                        auth: {
                                            api_key: process.env.SMTP_API_KEY,
                                            
                                        }
                                    }

                                    transporter = nodemailer.createTransport(sgTransport(options));
                                    const emailIsAllowedToReceive = (email) => {
                                        if (process.env.NODE_ENV && process.env.NODE_ENV === `production`) {
                                            return true;
                                        } else {
                                            return (email.address.indexOf(`shumsan1011`) > -1
                                                || email.address.indexOf(`aurora`) > -1
                                                || email.address.indexOf(`matthew@bonzabiketours.com`) > -1
                                                || email.address.indexOf(`toptal`) > -1);
                                        }
                                    };

                                    let toAddresses = [];
                                    this.to.map(item => {
                                        if (emailIsAllowedToReceive(item)) {
                                            toAddresses.push(item.address);
                                        } else {
                                            console.log(`Not sending the email to ${item} (development mode)`);
                                        }
                                    });

                                    let ccAddresses = [];
                                    this.cc.map(item => {
                                        if (emailIsAllowedToReceive(item)) {
                                            ccAddresses.push(item.address);
                                        } else {
                                            console.log(`Not sending the email to ${JSON.stringify(item)} (development mode)`);
                                        }
                                    });

                                    if (toAddresses.length > 0) {
                                        transporter.sendMail({
                                            from: `"${fromname}" <${from}>`,
                                            to: toAddresses.join(`,`),
                                            cc: ccAddresses.join(`,`),
                                            subject,
                                            html
                                        }).then(resolve).catch(reject);
                                    } else {
                                        resolve();
                                    }
                                }).catch(reject);
                            }
                        }).catch(reject);
                    }).catch(reject);
                }).catch(reject);
            }).catch(reject);
        });
    }
}

module.exports = Email;