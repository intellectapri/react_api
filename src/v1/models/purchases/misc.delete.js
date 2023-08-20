const db = require('./../../shared/db');

/**
 * Removes misc purchases and subtracts the total misc value from the purchase
 * 
 * @param {Number} purchaseId Purchase identifier
 */
const deleteAllMiscPurchasesForPurchase = (purchaseId) => {
    return new Promise((resolve, reject) => {

        db.get().execute(`SELECT totalGross, commission, totalNet FROM purchase_tour WHERE purchaseID = ${purchaseId}`, (err, results) => {
            if (err) { reject(err); return; }

            let totalGross = 0, totalNet = 0, commission = 0;
            if (results.length === 1) {
                let tourTotal = results.pop();
                totalGross = parseFloat(tourTotal['totalGross']);
                totalNet = parseFloat(tourTotal['totalNet']);
                commission = parseFloat(tourTotal['commission']);
            }

            db.get().execute(`UPDATE purchase SET totalGross = ${totalGross}, commission = ${commission}, totalNet = ${totalNet}
            WHERE purchaseID = ${purchaseId}`, (err) => {
            if (err) { reject(err); return; }

                db.get().execute(`DELETE FROM purchase_misc WHERE purchaseID = ${purchaseId}`, (err) => {
                    if (err) { reject(err); return; }

                    resolve();
                });
            });
        });
    });
};

module.exports = { deleteAllMiscPurchasesForPurchase };
