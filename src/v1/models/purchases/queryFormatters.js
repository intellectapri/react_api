/**
 * Generation of complex queries
 */

const utils = require('./../../shared/utils');

/**
 * Generates WHERE clause for tours and misc
 * 
 * @param {Object} data Filters
 * 
 * @returns {String}
 */
const getSearchSQL = (data) => {
    let tourWhereClauses = [];
    let miscWhereClauses = [];

    let tourDateWasQueried = false;
    
    if (utils.dateIsValid(data.tourDateFrom)) {
        tourDateWasQueried = true;
        tourWhereClauses.push(` tourDate >= '${data.tourDateFrom}' `);
        miscWhereClauses.push(` pt.tourDate >= '${data.tourDateFrom}' `);
    }

    if (utils.dateIsValid(data.tourDateTo)) {
        tourDateWasQueried = true;
        tourWhereClauses.push(` tourDate <= '${data.tourDateTo}' `);
        miscWhereClauses.push(` pt.tourDate <= '${data.tourDateTo}' `);
    }

    if (data.travelagency) {
        tourWhereClauses.push(` travelAgency LIKE '%${utils.sanitize(data.travelagency)}%' `);
    }

    if (data.productId) tourWhereClauses.push(` pt.productID = '${utils.sanitize(data.productId)}' `);
    if (data.bookingRefId) tourWhereClauses.push(` bookingRefID = '${utils.sanitize(data.bookingRefId)}' `);
    if (data.voucherIDs) {
        tourWhereClauses.push(` voucherIDs LIKE '%${utils.sanitize(data.voucherIDs)}%' `);
        //tourWhereClauses.push(` typeCode NOT IN ('VOUCHERS', 'MERCH', 'DRINK') `);
        //tourWhereClauses.push(` typeCode != 'MERCH' `);
        
    };

    let plainSearchFields = [`status`, `famils`];
    plainSearchFields.map(item => {
        if (item in data && data[item]) {
            tourWhereClauses.push(` ${item} = '${utils.sanitize(data[item])}' `);
        }
    });

    let purchaseTourWhereClause = ``;
    if (tourWhereClauses.length > 0) {
        purchaseTourWhereClause = ` AND ` + tourWhereClauses.join(` AND `);
    }

    let purchaseTourSearchSQL = `SELECT pt.detailID, pt.purchaseID, pt.status, pt.productID, 'tour' AS purchaseType,
        pt.tourDate, pt.noOfAdult, pt.noOfChildren, pt.noOfFamilyGroups, pt.noOfAdditionals, pt.noOfAddChildren,
        pt.family, CONCAT('\n',prod.name,'\n') AS name
        FROM purchase_tour pt
        INNER JOIN product prod ON prod.productID = pt.productID
        WHERE true ${purchaseTourWhereClause}`;

    let purchaseMiscSearchSQL = `SELECT detailID, purchaseID, '' AS status, productID, purchaseType, '' AS tourDate, 0 AS noOfAdult,
        0 AS noOfChildren, 0 AS noOfFamilyGroups, 0 AS noOfAdditionals,  0 AS noOfAddChildren, '' AS family, GROUP_CONCAT(name SEPARATOR ', ') AS name
        FROM (
            SELECT pm.detailID, pm.purchaseID, pm.productID, 'misc' AS purchaseType, CONCAT( prod.name,' (', SUM(qty) ,')') AS name
            FROM purchase_misc pm
            INNER JOIN product prod ON prod.productID = pm.productID
            ${tourDateWasQueried ? `INNER JOIN purchase_tour pt ON pt.purchaseID = pm.purchaseID` : ``}
            WHERE true ${((data.productId) ? (` AND pm.productID = '${data.productId}'`) : ``)} ${miscWhereClauses.length > 0 ? ` AND ${miscWhereClauses.join(` AND `)}` : ``}
            GROUP BY pm.purchaseID, pm.productID
        ) AS misc
        GROUP BY purchaseID`;	

    return !data.voucherIDs ? (purchaseTourSearchSQL + ` UNION ` + purchaseMiscSearchSQL) : purchaseTourSearchSQL ;
};

/**
 * Generates WHERE clause for general search query
 * 
 * @param {Object} data Filters
 * 
 * @returns {String}
 */
const getMainSearchSQL = (data) => {
    let whereClauses = [];
    if (utils.dateIsValid(data.purchaseDateFrom)) {
        whereClauses.push(` DATE(p.purchaseDate) >= '${data.purchaseDateFrom}' `);
    }

    if (utils.dateIsValid(data.purchaseDateTo)) {
        whereClauses.push(` DATE(p.purchaseDate) <= '${data.purchaseDateTo}' `);
    }

    if (data.travelerName) {
        whereClauses.push(` (p.travelerFirstname LIKE '%${utils.sanitize(data.travelerName)}%'
            OR p.travelerLastname LIKE '%${utils.sanitize(data.travelerName)}%') `);
    }

    if (data.myobAdded && !data.myobChanged) {
        whereClauses.push(` p.myobImport = 'added' `);
    }

    if (data.myobChanged && !data.myobAdded) {
        whereClauses.push(` p.myobImport = 'changed' `);
    }
    
    if (data.myobAdded && data.myobChanged) {
        whereClauses.push(` (p.myobImport = 'added' OR p.myobImport = 'changed')' `);
    }

    let regularFields = [{
        property: `travelerEmail`,
        field: `p.email`,
        text: true
    }, {
        property: `bookingPartnerId`,
        field: `p.customerID`
    }, {
        property: `userId`,
        field: `p.enteredBy`,
        text: true
    }, {
        property: `bookingId`,
        field: `p.purchaseID`
    }];

    regularFields.map(item => {
        if (data[item.property]) {
            if (item.text) {
                whereClauses.push(` ${item.field} =  '${utils.sanitize(data[item.property])}' `);
            } else {
                whereClauses.push(` ${item.field} =  ${utils.sanitize(data[item.property])} `);
            }
        }
    });

    let whereClauseSQL = ``;
    if (whereClauses.length > 0) {
        whereClauseSQL = `AND ` + whereClauses.join(` AND `);
    }

    return whereClauseSQL;
};

module.exports = { getMainSearchSQL, getSearchSQL };