const db = require('./../../shared/db');
const bookingPartners = require('./../bookingPartners');
const chargesRegenerate = require('./../charges/regenerate');
const sendConfirmation = require('./sendConfirmation');

const regenerateBookingPartnerInvoices = (purchaseId, purchaseCustomerID, userId, bookingPartnerEmail = false) => {
    return new Promise((resolve, reject) => {

        bookingPartners.getInvoiceOption(purchaseCustomerID).then(invoiceOption => {
            let invoicePromises = [];
            if (purchaseCustomerID > 0) {
                if (invoiceOption) {
                    invoicePromises.push(chargesRegenerate.regenerateInvoices(purchaseId, userId));
                }
            }

            Promise.all(invoicePromises).then(() => {
                if (bookingPartnerEmail) {
                    db.get().execute(`SELECT * FROM purchase_tour WHERE purchaseID = ${purchaseId}`, (err, results) => {
                        if (err) { reject(err); return; }

                        if (results.length === 1) {
                            sendConfirmation('customer', results[0].detailID, userId, bookingPartnerEmail).then(resolve).catch(reject);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            }).catch(reject);
        }).catch(reject);
    });
};

module.exports = {regenerateBookingPartnerInvoices};