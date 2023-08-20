
/**
 * Broadcasts
 */

const utils = require('./../shared/utils');
const broadcastUsers = require('./broadcastUsers');
const Email = require('./Email');

/**
 * Sends the email
 * 
 * @param {Number} emailId Email idenifier
 * 
 * @returns {Promise}
 */
const broadcast_send = (emailId) => {
    return Promise((resolve, reject) => {
        find(emailId).then(broadcastEmail => {
            if (broadcastEmail) {
                broadcastUsers.findAllByEmailId(emailId).then(emails => {
                    let totalSent = 0;
                    let sentPromises = [];
                    emails.map(line => {
                        let localEmail = new Email();
                        localEmail.setBody(broadcastEmail[`message`]);
                        localEmail.setSubject(broadcastEmail[`subject`]);
                        localEmail.setFrom(broadcastEmail[`sendFrom`]);
                        localEmail.addTo(line['contactEmail'], line['contactFirstname'] + ' ' + line['contactLastname']);
                        localEmail.addVariable(`{LEAD_TRAVELLER_LAST_NAME}`, line['contactLastname']);
                        broadcastAttachments.findAllByEmailId(emailId).then(attachments => {
                            attachments.map(attachment => {
                                localEmail.addAttachment(utils.EMAIL_ATTACHMENTS_DIR, attachment[`fileName`]);
                            });

                            totalSent++;
                            sentPromises.push(localEmail.send());
                        });
                    });

                    Promise.all(sentPromises).then(() => {
                        resolve({ totalSent });
                    }).catch(errors => {
                        reject(errors);
                    });
                }).catch(reject);
            } else {
                reject(utils.errors.NOT_FOUND);
            }
        });
    });
};

module.exports = { broadcast_send };