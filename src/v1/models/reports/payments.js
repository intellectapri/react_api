/**
 * Payments teports
 */

const moment = require('moment');
const Joi = require('joi');
const utils = require('./../../shared/utils');
const db = require('./../../shared/db');
const config = require('./../../../../config/config');

/**
 * Generate payments report
 * 
 * @param {Object} data Report settings
 * 
 * @returns {Promise}
 */
const payments = (data) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({
            from: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            to: Joi.string().regex(utils.DATE_CHECK_REGEXP).required(),
            paymentMethod: Joi.string().optional(),
            productId: Joi.number().integer().optional(),
            bookingPartnerId: Joi.number().integer().optional(),
        });

        Joi.validate(data, schema).then(() => {
            let sql = `(SELECT pt.detailID, pt.purchaseID, pt.productID, 'tour' AS purchaseType, pt.tourDate, CONCAT('<div>',prod.name,'</div>') AS name, prod.name AS pname
                FROM purchase_tour pt INNER JOIN product prod ON prod.productID = pt.productID)
                UNION
                (SELECT detailID, purchaseID, productID, purchaseType, '' AS tourDate, GROUP_CONCAT(name SEPARATOR ', ') AS name, GROUP_CONCAT(name SEPARATOR ', ') AS pname		
                FROM (
                    SELECT pm.detailID, pm.purchaseID, pm.productID, 'misc' AS purchaseType, CONCAT( prod.name,' (', SUM(qty) ,')') AS name
                    FROM purchase_misc pm
                    INNER JOIN product prod ON prod.productID = pm.productID
                    GROUP BY pm.purchaseID, pm.productID
                ) AS misc
                GROUP BY purchaseID)`;

            sql = `SELECT c.*, p.travelerFirstname, p.travelerLastname, p.myobImport, p.email, t.tourDate, t.detailID, t.purchaseType,
                GROUP_CONCAT(DISTINCT t.name ORDER BY t.purchaseType DESC SEPARATOR ' ') AS productName,
                GROUP_CONCAT(DISTINCT t.pname ORDER BY t.purchaseType DESC SEPARATOR ' ') AS pname
                FROM charge c
                INNER JOIN purchase p ON p.purchaseID = c.purchaseID
                INNER JOIN (${sql}) t ON t.purchaseID = c.purchaseID
                WHERE TRUE
                ${(data.from ? " AND DATE(c.paymentDate) >= '" + data.from  + "' ": "")}
                ${(data.to ? " AND DATE(c.paymentDate) <= '" + data.to + "' ": "")}
                ${(data.paymentMethod ? " AND c.method = '" + data.paymentMethod.toLowerCase() + "' ": "")}
                ${(data.productId ? " AND t.productID = " + parseInt(data.productId) + " ": "")}
                ${(data.bookingPartnerId ? " AND p.customerID = " + parseInt(data.bookingPartnerId) + " ": "")}
                GROUP BY c.chargeID ORDER BY c.method, c.type`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve(results);
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

/**
 * Exported version of payments report (CSV)
 * 
 * @param {Object} data Report settings
 * 
 * @returns {Promise}
 */
const paymentsExport = (data) => {
    return new Promise((resolve, reject) => {
        payments(data).then(results => {
            let c = ",";
            let s = '"';
            let nl = "\n";

            let str = "";
            str = str + "MYOB Status" + c;
            str = str + "Payment Date" + c;
            str = str + "Booking ID" + c;
            str = str + "Payment Method" + c;
            str = str + "Traveler Name" + c;	
            str = str + "Traveler Email" + c;	
            str = str + "Product" + c;
            str = str + "Tour Date" + c;
            str = str + "Payment Type" + c;
            str = str + "Amount" + c;
            str = str + "Liability" + nl;

            let total = 0;
            results.map(line => {
                let paymentDate = moment(line["paymentDate"]);
                let tourDate = moment(line["tourDate"], `YYYY-MM-DD`);

                let myobStat = ``;
                switch (line[`myobImport`]) {
                case 'notadded':	myobStat = 'Not Added'; break;
                case 'changed': myobStat = 'Changed'; break;
                case 'added': myobStat = 'Added'; break;
                }
                let amount = line["type"] === "payment" ? line["amount"] : -( parseFloat(line["amount"]).toLocaleString('en-AU') );
                str = str + s + myobStat + s + c;
                str = str + moment(paymentDate).format('DD/MM/YYYY') + c;
                str = str + line["purchaseID"] + c;
                str = str + line["method"] + c;
                str = str + s + line["travelerFirstname"] + " " + line["travelerLastname"] + s + c;
                
                str = str + s + line["email"] + s + c; 
                
                str = str + s + line["pname"] + s + c;			
                str = str + moment(tourDate).format('DD/MM/YYYY') + c;
                str = str + line["type"] + c;
                str = str + s + amount + s + c;
                str = str + ((parseInt(moment(tourDate).format('Ym')) > parseInt(moment(paymentDate).format('Ym')) ? "*" : "")) + nl;

                total = (line["type"] === "payment") ? (total + parseFloat(line["amount"])) : (total - parseFloat(line["amount"]));
            });

            str = str + "TOTAL,,,,,,," + total + ",\n";

            resolve(str);
        });
    });
};

module.exports = { payments, paymentsExport };
