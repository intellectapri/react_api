/**
 * Charges regeneration
 */
const db = require('./../../shared/db');

/**
 * Regenerates invoices for purchase
 * 
 * @param {Number} purchaseId Purchase identifier
 * @param {Number} userId     User identifier
 * 
 * @returns {Promise}
 */
const regenerateInvoices = (purchaseId, userId) => {
    return new Promise((resolve, reject) => {
        if (parseInt(purchaseId) > 0) {
            db.get().execute(`SELECT * FROM charge WHERE purchaseID = ${purchaseId} AND method = 'invoice'`, (err, invoicePayments) => {
                if (err) { reject(err.message); return; }

                db.get().execute(`SELECT totalNet FROM purchase WHERE purchaseID = ${purchaseId}`, (err, amountResult) => {
                    if (err) { reject(err.message); return; }
                    let amount = parseFloat(amountResult[0].totalNet);

                    let numberOfAddedInvoicePayments = 0;
                    let addedAmount = 0;
                    invoicePayments.map(item => {
                        if (item.addedToAccounting) {
                            numberOfAddedInvoicePayments++;
                            if (item.type === `payment`) {
                                addedAmount += parseFloat(item.amount);
                            } else if (item.type === `refund`) {
                                addedAmount -= parseFloat(item.amount);
                            }
                        }
                    });

                    let amountToCreateInvoiceWith = amount;
                    if (numberOfAddedInvoicePayments > 0) {
                        amountToCreateInvoiceWith = (amount - addedAmount);
                    }

                    if (numberOfAddedInvoicePayments === 0) {
                        db.get().execute(`DELETE FROM charge WHERE purchaseID = ${purchaseId} AND method = 'invoice' AND addedToAccounting = FALSE`, (err, invoicePayments) => {
                            if (err) { reject(err.message); return; }
                            if (amountToCreateInvoiceWith !== 0) {

                                if (process.env.DEBUG) console.log(`Regenerating invoice for ${purchaseId}`, amountToCreateInvoiceWith);

                                db.get().execute(`INSERT INTO charge SET purchaseID = ${purchaseId}, paymentDate = NOW(),
                                    type = '${amountToCreateInvoiceWith >= 0 ? 'payment' : 'refund'}',
                                    amount = ${(amountToCreateInvoiceWith >= 0 ? amountToCreateInvoiceWith : amountToCreateInvoiceWith * -1)},
                                    method = 'invoice', addedTime = NOW(), internalNotes = 'Automatically generated', addedStaff = ${userId}`, (err) => {
                                    if (err) { reject(err.message); return; }

                                    resolve();
                                });
                            } else {
                                resolve();
                            }
                        });
                    } else {
                        resolve();
                    }
                });
            });
        } else {
            reject(`Invalid purchase identifier: ${purchaseId}`);
        }
    });
};

module.exports = { regenerateInvoices };