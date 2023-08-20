var moment = require('moment');
var Joi = require('joi');
const utils = require('./../shared/utils');
const db = require('./../shared/db');
const { join } = require('mysql2/lib/constants/charset_encodings');
const CodeGenerator = require("node-code-generator");

const allowedTypeCodesRegExp = /^(ABSOLUTE|RELATIVE)$/;
const schema = Joi.object().keys({
    discountID: Joi.number(),
    discountType: Joi.string().regex(allowedTypeCodesRegExp).required(),
    discountCode: Joi.string().required(),
    expireDate: Joi.string().required(),
    discountAmount: Joi.alternatives().when('discountType',
        { is: 'RELATIVE', then: Joi.number().min(1).max(100).required(), otherwise: Joi.number().min(1).required()}
    ),
    active: Joi.number().required(),
    oneTimeUse: Joi.any().valid(1, 0, true, false),
    useCount: Joi.number(),
});

/**
 * Return specific discount
 * 
 * @param {Number} discountId Discount identifier
 * 
 * @returns {Promise}
 */
const get = (discountId) => {
    return new Promise((resolve, reject) => {
        if (discountId > 0) {
            
            db.get().execute(`SELECT * FROM discount WHERE discountID = ${discountId}`, (err, results) => {
                
                if (err) {
                    reject(err.message);
                } else if (results.length === 1) {
                    resolve(results[0]);
                } else {
                    reject(utils.errors.NOT_FOUND);
                }
            });
        } else {
            reject(`Invalid discount identifier`);
        }
    });
};
const getAll = (params) => {
    return new Promise( (resolve, reject) =>{
        const parameters = !!params ? Object.values(params) : [];
        const whereArgs = parseWhereClause(params);
        const where = parameters.length > 0 ? ` WHERE ${whereArgs}` : '';
        
        db.get().execute(`SELECT * FROM discount ${where}`, ( err, results ) =>{
            if(err){
               
                reject(err.message);
            }else{
                resolve(results);
            }
        });
    });
}
const create = (data) => {
    return new Promise( (resolve, reject) =>{
        Joi.validate(data, schema).then(() => {

            let keyValues = prepareValues(data);

            discountExists(data.discountCode).then( exists => {
                if(exists){
                    reject('There is a code like this already');
                }else{
                   db.get().execute(`INSERT INTO discount SET ${ keyValues.join(',') }`, (err, results) =>{
                        if(err){
                            reject(err);
                        }else {
                            resolve(results);
                        }
                    }) 
                }
                
            }).catch( err => {
                reject( 'We are not able to valid date the discount code')
            })
            
        }).catch( err => {
            reject(err);
        })
    })
}
const parseWhereClause = ( params ) => {
    if( typeof params !== 'object' || !params){
        return;
    }
    let args = [];
    if( params.active !== undefined ){
        args.push(`active='${params['active']}'`);
    }
    
    if( params.discountCode){
        args.push(`discountCode LIKE '%${params['discountCode']}%'`);
    }
    
    return args.join(' AND ');
}

const discountExists = (code) => {
    if( !code ){
        return;
    }
    return new Promise((resolve, reject) => {
        db.get().execute(`SELECT discountID FROM discount WHERE discountCode='${code}'`, (err, results ) => {
            if( err ){
                reject(err);
            }
            if(results[0]){
              resolve(true);  
            }
            resolve(false);
            
        });
    });
}

const prepareValues = (data) => {
    if( data.length < 1){
        return;
    }
    keyValuePairs = []
    for( let key in data){
        
        if( !!data[key]){
            keyValuePairs.push(`${key}='${utils.sanitize(data[key])}'`);
        }else{
            keyValuePairs.push(`${key}='${0}'`);
        }
        
    }
    return keyValuePairs;
}
const update = (discountID, data) => {
    return new Promise( (resolve, reject) =>{
        Joi.validate(data, schema).then(() => {
            let keyValues = prepareValues(data);
            
            db.get().execute(`UPDATE discount SET ${ keyValues.join(',')} WHERE discountID='${discountID}'`, (err, results) =>{
                if(err){
                    reject(err);
                }else {
                    resolve(results);
                }
            })
        }).catch( err => {
            reject(err);
        })
    })
}
const deleteDiscount = ( discountId ) => {
    return new Promise( (resolve, reject ) => {
        db.get().execute(`UPDATE discount SET active='0' WHERE discountID='${discountId}'`, (err, result) =>{
            if( err ){
                reject(err);
            }
            resolve(result);
        });
    })
}
const generateCode = (number) => {
    const generator = new CodeGenerator();
    const pattern = 'BONZAMS*+';
    var options = {
        existingCodesLoader: (pattern) => [],
        sparsity: 100
    };
    return generator.generateCodes(pattern, number, options);
}
module.exports = {
    get, 
    getAll,
    create,
    update,
    deleteDiscount,
    generateCode
}