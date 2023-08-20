/**
 * Purchases
 */
const Joi = require('joi');

const utils = require('./../../shared/utils');
const miscDelete = require('./misc.delete');
const db = require('./../../shared/db');
const queryFormatters = require('./queryFormatters');
const { getAll, searchVoucherTours } = require('./vouchers');

const {regenerateBookingPartnerInvoices} = require('./regenerateBookingPartnerInvoices');

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

/**
 * Returns purchase with specific identifier
 * 
 * @param {Number} id Purchase identifier
 * 
 * @returns {Promise}
 */
const find = (id) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0) {
            db.get().execute(`SELECT * FROM purchase WHERE purchaseID = ${id}`, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    if (results.length === 1) {
                        resolve(results[0]);
                    } else {
                        resolve(false);
                    }
                }
            });
        } else {
            reject(`Invalid identifier`);
        }
    });
};

/**
 * Returns all purchases
 * 
 * @returns {Promise}
 */
const findAll = () => {
    return new Promise((resolve, reject) => {
        if (id > 0) {
            db.get().execute(`SELECT * FROM purchase WHERE`, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        } else {
            reject(`Invalid identifier`);
        }
    });
};

/**
 * Recalculates total purchase price
 * 
 * @param {Number} id Purchase identifier
 * 
 *  @returns {Promise}
 */
const recalculateTotal = (id) => {
    return new Promise((resolve, reject) => {
        if (id > 0) {
            let sql = `SELECT
                customer.commissionLevel, p.customerID, pt.totalGross, pt.commission, pt.totalNet
                FROM purchase_tour pt
                LEFT JOIN purchase p ON p.purchaseID = pt.purchaseID
                LEFT JOIN customer ON customer.customerID = p.customerID
                WHERE pt.purchaseID = ${id}`;
            db.get().execute(sql, (err, results) => {
                if (err) { reject(err); return; }
                if (results.length === 1) {
                    let tourTotal = results.pop();
                    let comissionLevel = (tourTotal.commissionLevel ? parseFloat(tourTotal.commissionLevel) : 0);
                    db.get().execute(`SELECT SUM(price * qty) AS total FROM purchase_misc WHERE purchaseID = ${id}`, (err, results) => {
                        if (err) {
                            reject(err);
                        } else if (results.length !== 1) {
                            reject(`Unable to find misc purchase with identifier ${id}`);
                        } else {
                            let miscTotal = (results[0].total ? parseFloat(results[0].total) : 0);
                            let miscTotalWithComission = miscTotal * (100 - comissionLevel) / 100;
                            let overallGross = parseFloat(tourTotal['totalGross']) + parseFloat(miscTotal);
                            let overallCommission = parseFloat(tourTotal['commission']);
                            let overallNet = parseFloat(tourTotal['totalNet']) + parseFloat(miscTotalWithComission);

                            if (process.env.DEBUG) console.log(`Recalculating, overall gross ${overallGross}, commission ${overallCommission} and net ${overallNet}`);

                            sql = `UPDATE purchase SET
                                totalGross = ${overallGross},
                                commission = ${overallCommission},
                                totalNet = ${overallNet}
                            WHERE purchaseID = ${id}`;

                            db.get().execute(sql, (err) => {
                                if (err) { reject(err); return; }
                                resolve();
                            });
                        }
                    });
                } else {
                    reject(`Unable to find purchase with identifier ${id}`);
                }
            });
        } else {
            reject(`Invalid identifier`);
        }
    });
};

/**
 * Generates values population clauses
 * 
 * @param {Object} data Item details
 * 
 * @returns {String}
 */
const generatePopulateValuesClauses = (data) => {
    let valueClauses = [];
    if (data.customerId) valueClauses.push([` customerID = '${utils.sanitize(data.customerId)}' `]);
    if (data.travelerFirstname) valueClauses.push([` travelerFirstname = '${utils.sanitize(data.travelerFirstname)}' `]);
    if (data.travelerLastname) valueClauses.push([` travelerLastname = '${utils.sanitize(data.travelerLastname)}' `]);
    if (data.additionalNames) valueClauses.push([` additionalNames = '${utils.sanitize(data.additionalNames)}' `]);
    if (data.email) valueClauses.push([` email = '${utils.sanitize(data.email)}' `]);
    if (data.phone) valueClauses.push([` phone = '${utils.sanitize(data.phone)}' `]);
    if (data.hotel) valueClauses.push([` hotel = '${utils.sanitize(data.hotel)}' `]);
    if (data.country) valueClauses.push([` originCountry = '${utils.sanitize(data.country)}' `]);
    valueClauses.push([` totalGross = '${utils.sanitize(data.totalGross)}' `]);
    valueClauses.push([` commission = '${(data.commission ? utils.sanitize(data.commission) : 0)}' `]);
    valueClauses.push([` totalNet = '${utils.sanitize(data.totalNet)}' `]);
    if (data.revenueAccNo) valueClauses.push([` revenueAccNo = '${utils.sanitize(data.revenueAccNo)}' `]);
    if (data.invoice) valueClauses.push([` invoice = '${utils.sanitize(data.invoice)}' `]);
    if (data.invoiceDate) valueClauses.push([` invoiceDate = '${utils.sanitize(data.invoiceDate)}' `]);
    if (data.taxInc) valueClauses.push([` taxInc = '${utils.sanitize(data.taxInc)}' `]);
    if (data.taxCode) valueClauses.push([` taxCode = '${utils.sanitize(data.taxCode)}' `]);
    if (data.internalNotes) valueClauses.push([` internalNotes = '${utils.sanitize(data.internalNotes)}' `]);

    let valueClausesSQL = ``;
    if (valueClauses.length > 0) {
        valueClausesSQL = `, ` + valueClauses.join(` , `);
    }

    return valueClausesSQL;
};

/**
 * Returns purchase
 * 
 * @param {String} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */
const getPurchase = (purchaseId) => {
    return new Promise((resolve, reject) => {
        let result = false;
        getMiscPurchase(purchaseId).then(miscPurchase => {
            if (miscPurchase.tourPurchase === false) {
                result = miscPurchase;
                result.purchaseType = 'misc';
                resolve(result);
            } else {
                getTourPurchase(purchaseId).then(purchase => {
                    result = purchase;
                    result.purchaseType = 'tour';
                    resolve(result);
                }).catch(reject);
            }
        }).catch(reject);
    });
};

/**
 * Returns tour purchase
 * 
 * @param {String} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */
const getTourPurchase = (purchaseId) => {
    return new Promise((resolve, reject) => {
        if (parseInt(purchaseId) > 0) {
            let sql = `SELECT t.detailID as detailId, t.productID as productId, p.purchaseID as purchaseId, p.customerID as customerId,
                p.*, t.*, t.totalGross as totalGross, t.totalNet as totalNet,
                cust.name, cust.myob, cust.commissionLevel, cust.contactFirstname, cust.contactLastname, cust.contactEmail, cust.emailConfirmation,
                cust.reservationConfirmEmail, cust.paymentViaInvoice, cust.paymentDueTerm, cust.layout, cust.printedForm, cust.archived, cust.paymentMethod,
                cust.customerNotes
                FROM purchase p
                INNER JOIN (
                    SELECT *
                    FROM purchase_tour pt
                    WHERE true
                ) t ON t.purchaseID = p.purchaseID
                LEFT JOIN customer cust ON cust.customerID = p.customerID
                LEFT JOIN user u ON u.userID = p.enteredBy
                LEFT JOIN product prod ON prod.productID = t.productID
                WHERE p.purchaseID = ${purchaseId}`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err);
                } else if (results.length === 1) {
                    db.get().execute(`SELECT * FROM charge WHERE purchaseID = ${purchaseId} AND addedToAccounting = TRUE`, (err, accountedCharges) => {
                        if (err) {
                            reject(err);
                        } else {
                            let locked = (accountedCharges.length > 0);
                            db.get().execute(`SELECT * FROM purchase_misc WHERE purchaseID = ${purchaseId}`, (err, miscPurchases) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    let miscPurchasesTotal = 0;
                                    if (miscPurchases) {
                                        miscPurchases.map(item => {
                                            if (item.price && item.qty) {
                                                miscPurchasesTotal = miscPurchasesTotal + parseFloat(item.price) * parseFloat(item.qty);
                                            }
                                        });
                                    }

                                    let data = results[0];
                                    data.miscPurchases = {
                                        total: miscPurchasesTotal,
                                        items: miscPurchases
                                    };
                                    db.get().execute(`SELECT * FROM product WHERE productID = ${data.productID}`, (err, product ) => {
                                        if(err){
                                            reject(err);
                                        }
                                        data.product = product[0];
                                        
                                        data.locked = locked;

                                        resolve(data);
                                    })
                                    
                                }
                            });
                        }
                    });
                } else {
                    resolve(false);
                }
            });
        } else {
            reject(`Invalid tour purchase identifier ${purchaseId}`);
        }
    });
};

/**
 * Returns misc purchase
 * 
 * @param {String} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */
const getMiscPurchase = (purchaseId) => {
    return new Promise((resolve, reject) => {
        if (parseInt(purchaseId) > 0) {
            let sql = `SELECT prod.productID as productId, p.purchaseID as purchaseId, p.customerID as customerId, p.*,
                t.detailID as detailId, t.*, cust.name AS customerName, u.firstname, u.lastname
                FROM purchase p
                LEFT JOIN (
                    SELECT detailID, purchaseID, '' AS status, productID, purchaseType, GROUP_CONCAT(name SEPARATOR ', ') AS productName
                    FROM (
                        SELECT pm.detailID, pm.purchaseID, pm.productID, 'misc' AS purchaseType, CONCAT( prod.name,' (', SUM(qty) ,')') AS name
                        FROM purchase_misc pm
                        INNER JOIN product prod ON prod.productID = pm.productID
                        GROUP BY pm.purchaseID, pm.productID
                    ) AS misc
                    GROUP BY purchaseID
                ) t ON t.purchaseID = p.purchaseID
                LEFT JOIN customer cust ON cust.customerID = p.customerID
                LEFT JOIN user u ON u.userID = p.enteredBy
                LEFT JOIN product prod ON prod.productID = t.productID
                WHERE p.purchaseID = ${purchaseId}`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err);
                } else if (results.length === 1) {
                    let purchase = results[0];
                    db.get().execute(`SELECT * FROM purchase_misc WHERE purchaseID = ${purchaseId}`, (err, results) => {
                        if (err) {
                            reject(err);
                        } else {
                            db.get().execute(`SELECT * FROM charge WHERE purchaseID = ${purchaseId} AND addedToAccounting = TRUE`, (err, accountedCharges) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    let locked = (accountedCharges.length > 0);

                                    // Check if there is a corresponding tour purchase
                                    db.get().execute(`SELECT * FROM purchase_tour WHERE purchaseID = ${purchaseId}`, (err, tourPurchaseResults) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            purchase.products = results;
                                            purchase.products.map((item, index) => {
                                                purchase.products[index].productId = purchase.products[index].productID;
                                                if (item.qty) purchase.products[index].qty = parseFloat(purchase.products[index].qty);
                                                if (item.price) purchase.products[index].price = parseFloat(purchase.products[index].price);
                                            });

                                            purchase.tourPurchase = false;
                                            if (tourPurchaseResults.length === 1) {
                                                purchase.tourPurchase = tourPurchaseResults[0];
                                            }

                                            purchase.locked = locked;

                                            resolve(purchase);
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    resolve(false);
                }
            });
        } else {
            reject(`Invalid misc purchase identifier ${purchaseId}`);
        }
    });
};

/**
 * Creates purchase
 * 
 * @param {Object} data   Purchase information
 * @param {Number} userId User identifier
 * 
 * @returns {Promise}
 */
const create = (data, userId) => {
    return new Promise((resolve, reject) => {
        if (!userId) { reject(`Unable to detect the user identifier`); return; }

        Joi.validate(data, createSchema).then(() => {
            let valueClausesSQL = generatePopulateValuesClauses(data);
            let sql = `INSERT INTO purchase SET enteredBy = ${userId}, enteredAt = NOW(), purchaseDate = ${data.purchaseDate ? `'${data.purchaseDate}'` : `NOW()`} ${valueClausesSQL}`;
            
            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results.insertId);
                }
            });
        }).catch(error => {
            reject(error);
        });
    });
};

/**
 * Deletes misc purchase
 * 
 * @param {String} purchaseId Purchase identifier
 * 
 * @returns {Promise}
 */
const deleteMiscPurchase = (purchaseId, userId) => {
    return new Promise((resolve, reject) => {
        if (!purchaseId) { reject(`Unable to detect the purchase identifier`); return; }

        purchaseId = parseInt(purchaseId);

        // Checking if the misc purchase is the standalone one
        db.get().execute(`SELECT * FROM purchase_tour WHERE purchaseID = ${purchaseId}`, (err, checkResults) => {
            if (err) { reject(err); return; }

            // Making sure that no payments left
            db.get().execute(`SELECT * FROM charge WHERE purchaseID = ${purchaseId}`, (err, results) => {
                if (err) { reject(err); return; }
                if (results.length !== 0) { reject('Unable to delete misc purchase with payments left'); return; }

                if (checkResults.length === 0) {
                    db.get().execute(`DELETE FROM purchase WHERE purchaseID = ${purchaseId}`, (err, results) => {
                        if (err) { reject(err); return; }
                        db.get().execute(`DELETE FROM purchase_misc WHERE purchaseID = ${purchaseId}`, (err, results) => {
                            if (err) { reject(err); return; }

                            resolve({status: 'success'});
                        });
                    });
                } else {
                    find(purchaseId).then(purchase => {
                        miscDelete.deleteAllMiscPurchasesForPurchase(purchaseId).then(() => {
                            recalculateTotal(purchaseId).then(() => {
                                if (true && purchase.customerID !== 211) {
                                    regenerateBookingPartnerInvoices(purchaseId, purchase.customerID, userId, false).then(() => {
                                        resolve({status: 'success'});
                                    }).catch(reject);
                                } else {
                                    resolve({status: 'success'});
                                }
                            }).catch(reject);
                        }).catch(reject);
                    }).catch(reject);
                }
            });
        });
    });
};

/**
 * Updates purchase
 * 
 * @param {Object} data   Purchase information
 * @param {Number} userId User identifier
 * 
 * @returns {Promise}
 */
const update = (data, userId) => {
    return new Promise((resolve, reject) => {
        if (!data.purchaseId) { reject(`Unable to detect the purchase identifier`); return; }
        if (!userId) { reject(`Unable to detect the user identifier`); return; }

        let valueClausesSQL = generatePopulateValuesClauses(data);
        let purchaseDateUpdate = `, purchaseDate = ${data.purchaseDate ? "'" + data.purchaseDate + "'" : `NOW()`}`;
        if (data.noPurchaseDate) {
            purchaseDateUpdate = ``;
        }

        let sql = `UPDATE purchase SET updatedBy = ${userId}, updatedAt = NOW() ${purchaseDateUpdate} ${valueClausesSQL} WHERE purchaseID = ${data.purchaseId}`;
        db.get().execute(sql, (err) => {
            if (err) { reject(err); return; }
            resolve();
        });
    });
};

/**
 * Calculates total number of found records
 * 
 * @param {Array} data Filters
 * 
 * @returns {Integer}
 */
const searchTotal = (data, {additionalJoinQuery, additionalWhereQuery}) => {
    return new Promise((resolve, reject) => {
        let searchSQL = queryFormatters.getSearchSQL(data);
        let mainSearchSQL = queryFormatters.getMainSearchSQL(data);

        let purchaseTypeTour = ``;
        if (data.purchaseTour || (!data.purchaseMisc || parseInt(data.purchaseMisc) === 0)) {
            purchaseTypeTour = ` OR t.purchaseType = 'tour' `;
        }
    
        let purchaseTypeMisc = ``;
        if (data.purchaseMisc || (!data.purchaseTour || parseInt(data.purchaseTour) === 0)) {
            purchaseTypeMisc = ` OR t.purchaseType = 'misc' `;
        }

        sql = `SELECT COUNT(*) as total FROM (
            SELECT ppp.* FROM (
                SELECT p.purchaseID
                FROM purchase p
                INNER JOIN (${searchSQL}) t ON t.purchaseID = p.purchaseID						
                LEFT JOIN customer cust ON cust.customerID = p.customerID
                LEFT JOIN user u ON u.userID = p.enteredBy
                WHERE true AND (t.purchaseType = 'tourmisc' ${purchaseTypeTour} ${purchaseTypeMisc}) ${mainSearchSQL}
                GROUP BY p.purchaseID
            ) AS ppp
            ${additionalJoinQuery}
            ${additionalWhereQuery}
        ) as totalSet`;

        db.get().execute(sql, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results.pop().total);
            }
        });
    });
};

/**
 * Searches in purchases according to provided filters
 * 
 * @param {Object} data Filters
 * 
 * @returns {Promise}
 */
const search = (data) => {
    return new Promise((resolve, reject) => {
        let { selectLimit, selectOffset, selectOrder } = utils.getPaginationSettings(data);
        let allowedOrderByColumns = [`status`, `bookingID`, `tourdate`, `lastname`, `product`, `totalguest`, `outstanding`,
            `customer`, `children`, `adult`, `family`, `addition`, `sale`, `enteredby`, `purchasedate`,
            `noOfAdult`, `noOfChildren`, `noOfFamilyGroups`, `noOfAdditionals`, `totalNet`, `purchaseDate`,
            `customerName`, `tourDate`, `travelerLastname`, `productName`, `purchaseID`, `voucherIDs`];
        let selectSortByClause = ` ORDER BY tourDate ${selectOrder} `;

        let sortBy = `tourDate`;
        if (`sortBy` in data && data.sortBy && allowedOrderByColumns.indexOf(data.sortBy) > -1) {
            sortBy = data.sortBy;

            if (data.sortBy === `purchaseID`) data.sortBy = `purchaseID`;
            if (data.sortBy === `tourdate`) data.sortBy = `tourDate`;
            if (data.sortBy === `lastname`) data.sortBy = `travelerLastname`;
            if (data.sortBy === `product`) data.sortBy = `productName`;
            if (data.sortBy === `customer`) data.sortBy = `customerName`;
            if (data.sortBy === `adult`) data.sortBy = `noOfAdult`;
            if (data.sortBy === `children`) data.sortBy = `noOfChildren`;
            if (data.sortBy === `family`) data.sortBy = `noOfFamilyGroups`;
            if (data.sortBy === `addition`) data.sortBy = `noOfAdditionals`;
            if (data.sortBy === `sale`) data.sortBy = `totalNet`;
            if (data.sortBy === `enteredby`) data.sortBy = `totalNet`;
            if (data.sortBy === `purchasedate`) data.sortBy = `purchaseDate`;
            //if (data.sortBy === `voucherCode`) data.sortBy = `voucherCode`;
            if (data.sortBy === `voucherIDs`) data.sortBy = `voucherIDs`;

            selectSortByClause = ` ORDER BY ${data.sortBy} ${selectOrder} `;
            if (data.sortBy === `enteredby`) selectSortByClause = ` ORDER BY firstname ${selectOrder}, lastname ${selectOrder} `;
        }

        let outerSortBy = ``;
        if (data.sortBy === `totalGuest`) outerSortBy = ` ORDER BY totalGuest ${selectOrder} `;

        let selectLimitOffsetClause = ` ${selectSortByClause} LIMIT ${selectLimit} OFFSET ${selectOffset}`;
    
        let selectSearchSQL = queryFormatters.getSearchSQL(data);
        let selectPrimarySearchSQL = queryFormatters.getSearchSQL(data);
        let whereClauseSQL = queryFormatters.getMainSearchSQL(data);
        
        let purchaseTypeTour = ``;
        if (data.purchaseTour || (!data.purchaseMisc || parseInt(data.purchaseMisc) === 0)) {
            purchaseTypeTour = ` OR t.purchaseType = 'tour' `;
        }
    
        let purchaseTypeMisc = ``;
        if (data.purchaseMisc || (!data.purchaseTour || parseInt(data.purchaseTour) === 0)) {
            purchaseTypeMisc = ` OR t.purchaseType = 'misc' `;
        }

        let additionalJoinQuery = ``;
        let additionalJoinQueries = [];
        let additionalWhereQuery = ``;
        let additionalWhereQueries = [];

        if (data.famils) additionalWhereQueries.push(` extra_search.famils = 1 `);
        if (data.family) additionalWhereQueries.push(` extra_search.family = 1 `);
        if (data.bookingRefId) additionalWhereQueries.push(` extra_search.bookingRefID LIKE '%${data.bookingRefId}%' `);
        if (data.travelagency) additionalWhereQueries.push(` extra_search.travelAgency LIKE '%${data.travelagency}%' `);
        // if( data.voucherIDs) {
            
        //     additionalWhereQueries.push(` extra_search.voucherIDs LIKE '%${data.voucherIDs}%' `);
        // }
        if (additionalWhereQueries.length > 0) {
            additionalJoinQueries.push(` INNER JOIN purchase_tour extra_search ON extra_search.purchaseID = ppp.purchaseID `);
        }

        if (data.travelerName) {
            additionalJoinQueries.push(` INNER JOIN purchase extra_search_p ON extra_search_p.purchaseID = ppp.purchaseID `);
            additionalWhereQueries.push(` extra_search_p.travelerLastname LIKE '%${data.travelerName}%' `);
        }

        if (additionalWhereQueries.length > 0) {
            additionalJoinQuery = additionalJoinQueries.join(` `);
            additionalWhereQuery = ` WHERE ${additionalWhereQueries.join(` AND `)}`
        }

        let sql = `SELECT *, (totalNet - IF(totalPaid IS NULL, 0, totalPaid)) as outstanding
        FROM (
            SELECT p.*, IF(family = 0, noOfAdult + noOfChildren, noOfFamilyGroups * 4 + noOfAdditionals + noOfAddChildren) as totalGuest,
                SUM(IF(c.type = 'payment',c.amount,c.amount*-1)) as totalPaid
            FROM (
                SELECT ppp.* FROM (
                    SELECT
                        p.purchaseID, p.purchaseDate, p.travelerLastname,  p.totalNet, p.myobImport,
                        t.detailID, tt.status, tt.tourDate, tt.noOfAdult, tt.noOfChildren, tt.noOfFamilyGroups, tt.noOfAdditionals, tt.noOfAddChildren, tt.family,
                        GROUP_CONCAT(DISTINCT t.name ORDER BY t.purchaseType DESC SEPARATOR ', ') AS productName,
                        GROUP_CONCAT(DISTINCT t.purchaseType ORDER BY t.purchaseType DESC SEPARATOR '') AS purchaseType,
                        cust.name AS customerName,
                        p.enteredBy, p.enteredAt, p.updatedBy, p.updatedAt
                    FROM purchase p
                    INNER JOIN (${selectSearchSQL}) t ON t.purchaseID = p.purchaseID
                    INNER JOIN (${selectPrimarySearchSQL}) tt ON tt.purchaseID = p.purchaseID
                    LEFT JOIN customer cust ON cust.customerID = p.customerID
                    WHERE true AND (t.purchaseType = 'tourmisc' ${purchaseTypeTour} ${purchaseTypeMisc}) ${whereClauseSQL}
                    GROUP BY p.purchaseID
                ) AS ppp 

                ${additionalJoinQuery}
                ${additionalWhereQuery}
                ${selectLimitOffsetClause}
            ) AS p
            LEFT JOIN charge c ON c.purchaseID = p.purchaseID
            GROUP BY p.purchaseID
            ${outerSortBy}
        ) AS t
        WHERE t.purchaseType = 'tourmisc' ${purchaseTypeTour} ${purchaseTypeMisc} ${selectSortByClause}`;

        db.get().execute(sql, (err, results) => {
            if (err) {
                reject(err);
            } else {
                searchTotal(data, {additionalJoinQuery, additionalWhereQuery}).then(totalNumber => {
                    resolve({
                        total: totalNumber,
                        offset: selectOffset,
                        limit: selectLimit,
                        order: selectOrder,
                        orderBy: sortBy,
                        data: results
                    });
                });
            }
        });
    });
};

/**
 * Checks if specified date is booked for specific product
 * 
 * @param {Number} productId Checked product identifier
 * @param {String} date      Checked date
 * 
 * @returns {Promise}
 */
const isBookedDate = (productId, date) => {
    return new Promise((resolve, reject) => {
        if (productId && date) {
            productId = utils.sanitize(productId);
            date = utils.sanitize(date);

            db.get().execute(`SELECT * FROM purchase_tour WHERE status = 'active'
                AND DATE_FORMAT(tourDate,'%Y-%m-%d') = '${date}' AND productID = ${productId}`, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    if (results.length > 0) {
                        resolve({ isBooked: true });
                    } else {
                        resolve({ isBooked: false });
                    }
                }
            });
        } else {
            reject(`Invalid parameters were provided`);
        }
    });
};

/**
 * Searches for all purchases of the specific customer
 * 
 * @param {Number} id     Customer identifier
 * @param {Object} parmss Selection parameters
 */
const findAllByCustomerId = (id, params) => {
    return new Promise((resolve, reject) => {
        if (parseInt(id) > 0) {
            let { selectLimit, selectOffset } = utils.getPaginationSettings(params);

            let detailsSQL = `SELECT pt.detailID, pt.purchaseID, pt.status, pt.productID, 'tour' AS purchaseType,
                pt.tourDate, pt.noOfAdult, pt.noOfChildren, pt.noOfFamilyGroups, pt.noOfAddChildren, pt.noOfAdditionals,
                pt.family, prod.name AS name
                FROM purchase_tour pt
                INNER JOIN product prod ON prod.productID = pt.productID
                UNION 
                SELECT detailID, purchaseID, '' AS status, productID, purchaseType, '' AS tourDate, '' AS noOfAdult, '' AS noOfChildren,
                    '' AS noOfFamilyGroups, '' AS noOfAddChildren, '' AS noOfAdditionals, '' AS family, GROUP_CONCAT(name SEPARATOR ', ') AS name
                FROM (
                    SELECT pm.detailID, pm.purchaseID, pm.productID, 'misc' AS purchaseType, CONCAT( prod.name,' (', SUM(qty) ,')') AS name
                    FROM purchase_misc pm
                    INNER JOIN product prod ON prod.productID = pm.productID
                    GROUP BY pm.purchaseID, pm.productID
                ) AS misc
                GROUP BY purchaseID`;

            let sql = `SELECT *, IF(family = 0, noOfAdult + noOfChildren, noOfFamilyGroups * 4 + noOfAdditionals + noOfAddChildren) as totalGuest, (totalNet - IF(totalPaid IS NULL,0,totalPaid)) as outstanding
            FROM(
                    SELECT p.purchaseID, p.purchaseDate, p.travelerFirstname, p.travelerLastname,  p.totalNet,
                    t.detailID, t.status, t.tourDate, t.noOfAdult, t.noOfChildren, t.noOfFamilyGroups, t.noOfAdditionals, t.noOfAddChildren, t.family,
                    GROUP_CONCAT(DISTINCT t.name ORDER BY t.purchaseType DESC SEPARATOR ' ') AS productName,
                    GROUP_CONCAT(DISTINCT t.purchaseType ORDER BY t.purchaseType DESC SEPARATOR '') AS purchaseType,
                    SUM(IF(c.type = 'payment',c.amount,c.amount*-1)) as totalPaid,
                    cust.name AS customerName,
                    u.firstname, u.lastname
                    FROM purchase p
                    INNER JOIN (${detailsSQL}) t ON t.purchaseID = p.purchaseID
                    LEFT JOIN charge c ON c.purchaseID = p.purchaseID
                    LEFT JOIN customer cust ON cust.customerID = p.customerID
                    LEFT JOIN user u ON u.userID = p.enteredBy
                    WHERE p.customerID = ${id}
                    GROUP BY p.purchaseID
            ) AS t
            GROUP BY purchaseDate LIMIT ${selectLimit} OFFSET ${selectOffset}`;

            db.get().execute(sql, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        } else {
            reject(utils.errors.NOT_FOUND);
        }
    });
};


module.exports = { find, findAll, create, update, deleteMiscPurchase, getPurchase, search, recalculateTotal, isBookedDate, getTourPurchase, getMiscPurchase, findAllByCustomerId, getAll, searchVoucherTours  };