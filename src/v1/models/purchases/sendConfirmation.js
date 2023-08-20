/**
 * Sending tour confirmation
 */

const moment = require('moment');

const Email = require('./../Email');

const utils = require('./../../shared/utils');
const chargesBalance = require('./../charges/balance');
const db = require('./../../shared/db');
const products = require('./../products');
const { find, findOverallPurchase } = require('./tour.find');

/**
 * Returns the tour time
 * 
 * @param {Object} purchase Purchase object
 * 
 * @returns {Promise}
 */
const getTourTime = (purchase) => {
    return new Promise((resolve, reject) => {
        if (purchase.prod_tourTime) {
            resolve(purchase.prod_tourTime);
        } else if (purchase.overrideTourTime) {
            resolve(moment(purchase.overrideTourTime, `HH:mm:ss`).format(`h:mm a`));
        } else {
            products.getTourTime(purchase.productId, moment(purchase.tourDate).format(`YYYY-MM-DD`)).then(resolve).catch(reject);
        }
    });
};

/**
 * Sends confirmation upon tour purchase
 * 
 * @param {String} texttype  Text type
 * @param {Number} detaildId Purchased tour identifier
 * @param {Number} userId    Author identifier
 * @param {String} email     Optional email
 * 
 * @returns {Promise}
 */
const sendConfirmation = (texttype, detaildId, userId, email, voucherCodes=[]) => {
    return new Promise((resolve, reject) => {
        if (detaildId > 0 && userId > 0) {
            find(detaildId).then(purchase => {
                if (purchase) {
                    findOverallPurchase(purchase.purchaseID).then(overallPurchase => {
                        db.get().execute(`SELECT * FROM purchase_misc pm
                            LEFT JOIN product prod ON prod.productID = pm.productID
                            WHERE purchaseID = ${purchase.purchaseID}`, (err, miscPurchases) => {
                            if (err) {
                                reject(err);
                            } else {
                                getTourTime(purchase).then(tourTime => {
                                    let totalAdults, totalChildrens, totalGuests, totalFamilies = 0, totalAdditional = 0;
                                    let numberOfBabies = (purchase.noOfBabies && parseInt(purchase.noOfBabies) > 0 ? parseInt(purchase.noOfBabies) : 0);
                                    if (purchase.family === 1) {
                                        totalFamilies = parseInt(purchase['noOfFamilyGroups']);
                                        totalAdditional = parseInt(purchase['noOfAdditionals']);
                                        totalAdults = parseInt((purchase['noOfFamilyGroups'] * 2) + parseInt(purchase['noOfAdditionals']));
                                        totalChildrens = parseInt((purchase['noOfFamilyGroups'] * 2) + parseInt(purchase['noOfAddChildren']));
                                        totalGuests = totalAdults + totalChildrens;
                                    } else {
                                        totalGuests = purchase['noOfAdult'] + purchase['noOfChildren'] + numberOfBabies;
                                        totalAdults = purchase['noOfAdult'];
                                        totalChildrens = purchase['noOfChildren'];
                                    }

                                    chargesBalance.balance(purchase.purchaseId).then(amountPaid => {
                                        amountOutstanding = utils.dollarFormat(purchase['totalNet'] - amountPaid);
                                        amountPaid = utils.dollarFormat(amountPaid);

                                        let emailInstance = new Email(purchase.templateCode);
                                        emailInstance.setTexttype(texttype);
                                        if (texttype === `standard` || texttype === `voucher`) {
                                            emailInstance.addTo(purchase[`email`], (purchase[`travelerFirstname`] + ` ` + purchase[`travelerLastname`]));
                                        } else if (texttype === `customer`) {
                                            emailInstance.addTo(email ? email : purchase[`partnerEmail`], purchase["customerName"]);
                                        } else {
                                            emailInstance.addTo(purchase[`operatorEmail`], `Operator`);
                                        }
                                        
                                        if( texttype === 'standard' && voucherCodes && purchase.voucherIDs ){
                                            
                                            emailInstance.addVariable('{VOUCHER CODES}', voucherCodes.join(', ') );
                                        }
                                    
                                        emailInstance.addVariable('{TOUR_DATE}', moment(purchase['tourDate']).format(`dddd, DD-MMM-YYYY`));
                                        emailInstance.addVariable('{TOUR_TIME}', tourTime);
                                        emailInstance.addVariable('{TOUR_TYPE}', purchase['productName']);
                                        emailInstance.addVariable('{TOUR_LANGUAGE}', purchase['language']);
                                        emailInstance.addVariable('{LEAD_TRAVELLER_LAST_NAME}', purchase['travelerLastname']);
                                        emailInstance.addVariable('{NUMBER_OF_ADULTS}', totalAdults, true);
                                        emailInstance.addVariable('{NUMBER_OF_CHILDREN}', totalChildrens, true);
                                        emailInstance.addVariable('{NUMBER_OF_FAMILIES}', totalFamilies, true);
                                        emailInstance.addVariable('{ADDITIONAL_RIDERS}', totalAdditional, true);
                                        emailInstance.addVariable('{TOTAL_GUESTS}', totalGuests);
                                        emailInstance.addVariable('{BOOKING_ID}', purchase['purchaseID']);
                                        emailInstance.addVariable('{AMOUNT_PAID}', amountPaid);
                                        emailInstance.addVariable('{AMOUNT_OUTSTANDING}', amountOutstanding);
                                        emailInstance.addVariable('{GUEST_NOTES}', purchase['guestNote'] ? purchase['guestNote'] : '');
                                        emailInstance.addVariable('{BOOKING_REF_ID}', purchase['bookingRefID']);
                                        emailInstance.addVariable('{BOOKING_STATUS}', purchase['status'].charAt(0).toUpperCase() + purchase['status'].slice(1));
                                        emailInstance.addVariable('{VOUCHER_PURCHASER_LAST_NAME}', purchase['voucherLastname']);
                                        emailInstance.addVariable('{NUMBER_OF_INFANTS}', purchase.noOfBabies, true);
                                        
                                        let miscPruchasesString = false;
                                        if (miscPurchases && miscPurchases.length > 0) {
                                            miscPruchasesString = [];
                                            miscPurchases.map(item => {
                                                miscPruchasesString.push(`${item.name} (${item.qty})`);
                                            });

                                            miscPruchasesString = miscPruchasesString.join(`, `);
                                        }

                                        emailInstance.addVariable('{LIST_MISCELLANEOUS_PURCHASES}', miscPruchasesString, true);

                                        let equipmentList = [];
                                        if (purchase.babySeats && parseInt(purchase.babySeats) > 0)  equipmentList.push(`Baby seats (${purchase.babySeats})`);
                                        if (purchase.trailAlongs && parseInt(purchase.trailAlongs) > 0)  equipmentList.push(`Trail alongs (${purchase.trailAlongs})`);
                                        if (purchase.smallKidsBikes && parseInt(purchase.smallKidsBikes) > 0)  equipmentList.push(`Small kids bikes (${purchase.smallKidsBikes})`);
                                        if (purchase.largeKidsBikes && parseInt(purchase.largeKidsBikes) > 0)  equipmentList.push(`Large kids bikes (${purchase.largeKidsBikes})`);
                                        emailInstance.addVariable('{LIST_EQUIPMENT}', (equipmentList.length > 0 ? equipmentList.join(`, `) : false), true);

                                        emailInstance.addVariable('{NETT_SALE_AMOUNT}', (overallPurchase.totalNet ? '$' + overallPurchase.totalNet : false), true);
                                        
                                        emailInstance.send().then(() => {
                                            emailInstance.save(userId, detaildId).then(resolve).catch(reject);
                                        }).catch(reject);
                                        
                                    }).catch(reject);
                                }).catch(reject);


                            }
                        });


                    }).catch(reject);
                } else {
                    reject(`Unable to find tour purchase with identifier ${detaildId}`);
                }
            }).catch(reject);
        } else {
            reject(`Invalid tour purchase identifier or user identifier`);
        }
    });
};

module.exports = sendConfirmation;