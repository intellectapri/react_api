const Joi = require('joi');

const utils = require('./../../shared/utils');
//const miscDelete = require('./misc.delete');
const db = require('./../../shared/db');
const queryFormatters = require('./queryFormatters');
//const {regenerateBookingPartnerInvoices} = require('./regenerateBookingPartnerInvoices');

const createSchema = Joi.object().keys({
    totalGross: Joi.any().required(),
    commission: Joi.any().required(),
    totalNet: Joi.any().required(),
    customerId: Joi.any().required(),
    travelerFirstname: Joi.string().allow(''),
    travelerLastname: Joi.string().allow(''),
    additionalNames: Joi.string().allow(''),
    email: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    hotel: Joi.string().allow(''),
    country: Joi.string().allow(''),
    revenueAccNo: Joi.string().allow(''),
    invoice: Joi.string().allow(''),
    invoiceDate: Joi.string().regex(utils.DATE_CHECK_REGEXP),
    taxInc: Joi.string().allow(''),
    taxCode: Joi.string().allow(''),
    userId: Joi.string().required(),
    internalNotes: Joi.string().allow('')
}).unknown(true);


const getAll = (options) => {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM purchase_tour LEFT JOIN product ON purchase_tour.productID = product.productID WHERE typeCode = 'VOUCHERS'`;
        // if(options.voucherIsUsed){
        //     sql += ` AND purchase_tour.voucherIsUsed=${options.voucherIsUsed}`;
        // }
        // if(options.voucherExpireDate){
        //     sql += ` AND purchase_tour.voucherExpireDate=${options.voucherExpireDate}`;
        // }
        db.get().execute(sql, (err, results) => {
            if (err) {
                reject(err);
            } else {
                
                resolve(results);
                
            }
        });
    });
};
const searchVoucherTours = (options) => {
    if(!options.voucherCode){
        return getAll()
    }
    const sql = `SELECT * FROM purchase_tour LEFT JOIN product ON purchase_tour.productID = product.productID WHERE typeCode = 'VOUCHERS' AND purchase_tour.voucherCode LIKE '%${options.voucherCode}%'`;
    return new Promise( (resolve, reject) => {
        db.get().execute(sql, (err, results) =>{
            if(err){
                reject(err);
            }
            resolve(results);
        });
    } );
}
module.exports = {
    getAll,
    searchVoucherTours
}