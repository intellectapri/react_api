"use strict";

/**
 * Generation of complex queries
 */
var utils = require('./../../shared/utils');
/**
 * Generates WHERE clause for tours and misc
 * 
 * @param {Object} data Filters
 * 
 * @returns {String}
 */


var getSearchSQL = function getSearchSQL(data) {
  var tourWhereClauses = [];
  var miscWhereClauses = [];
  var tourDateWasQueried = false;

  if (utils.dateIsValid(data.tourDateFrom)) {
    tourDateWasQueried = true;
    tourWhereClauses.push(" tourDate >= '".concat(data.tourDateFrom, "' "));
    miscWhereClauses.push(" pt.tourDate >= '".concat(data.tourDateFrom, "' "));
  }

  if (utils.dateIsValid(data.tourDateTo)) {
    tourDateWasQueried = true;
    tourWhereClauses.push(" tourDate <= '".concat(data.tourDateTo, "' "));
    miscWhereClauses.push(" pt.tourDate <= '".concat(data.tourDateTo, "' "));
  }

  if (data.travelagency) {
    tourWhereClauses.push(" travelAgency LIKE '%".concat(utils.sanitize(data.travelagency), "%' "));
  }

  if (data.productId) tourWhereClauses.push(" pt.productID = '".concat(utils.sanitize(data.productId), "' "));
  if (data.bookingRefId) tourWhereClauses.push(" bookingRefID = '".concat(utils.sanitize(data.bookingRefId), "' "));

  if (data.voucherIDs) {
    tourWhereClauses.push(" voucherIDs LIKE '%".concat(utils.sanitize(data.voucherIDs), "%' ")); //tourWhereClauses.push(` typeCode NOT IN ('VOUCHERS', 'MERCH', 'DRINK') `);
    //tourWhereClauses.push(` typeCode != 'MERCH' `);
  }

  ;
  var plainSearchFields = ["status", "famils"];
  plainSearchFields.map(function (item) {
    if (item in data && data[item]) {
      tourWhereClauses.push(" ".concat(item, " = '").concat(utils.sanitize(data[item]), "' "));
    }
  });
  var purchaseTourWhereClause = "";

  if (tourWhereClauses.length > 0) {
    purchaseTourWhereClause = " AND " + tourWhereClauses.join(" AND ");
  }

  var purchaseTourSearchSQL = "SELECT pt.detailID, pt.purchaseID, pt.status, pt.productID, 'tour' AS purchaseType,\n        pt.tourDate, pt.noOfAdult, pt.noOfChildren, pt.noOfFamilyGroups, pt.noOfAdditionals, pt.noOfAddChildren,\n        pt.family, CONCAT('\n',prod.name,'\n') AS name\n        FROM purchase_tour pt\n        INNER JOIN product prod ON prod.productID = pt.productID\n        WHERE true ".concat(purchaseTourWhereClause);
  var purchaseMiscSearchSQL = "SELECT detailID, purchaseID, '' AS status, productID, purchaseType, '' AS tourDate, 0 AS noOfAdult,\n        0 AS noOfChildren, 0 AS noOfFamilyGroups, 0 AS noOfAdditionals,  0 AS noOfAddChildren, '' AS family, GROUP_CONCAT(name SEPARATOR ', ') AS name\n        FROM (\n            SELECT pm.detailID, pm.purchaseID, pm.productID, 'misc' AS purchaseType, CONCAT( prod.name,' (', SUM(qty) ,')') AS name\n            FROM purchase_misc pm\n            INNER JOIN product prod ON prod.productID = pm.productID\n            ".concat(tourDateWasQueried ? "INNER JOIN purchase_tour pt ON pt.purchaseID = pm.purchaseID" : "", "\n            WHERE true ").concat(data.productId ? " AND pm.productID = '".concat(data.productId, "'") : "", " ").concat(miscWhereClauses.length > 0 ? " AND ".concat(miscWhereClauses.join(" AND ")) : "", "\n            GROUP BY pm.purchaseID, pm.productID\n        ) AS misc\n        GROUP BY purchaseID");
  return !data.voucherIDs ? purchaseTourSearchSQL + " UNION " + purchaseMiscSearchSQL : purchaseTourSearchSQL;
};
/**
 * Generates WHERE clause for general search query
 * 
 * @param {Object} data Filters
 * 
 * @returns {String}
 */


var getMainSearchSQL = function getMainSearchSQL(data) {
  var whereClauses = [];

  if (utils.dateIsValid(data.purchaseDateFrom)) {
    whereClauses.push(" DATE(p.purchaseDate) >= '".concat(data.purchaseDateFrom, "' "));
  }

  if (utils.dateIsValid(data.purchaseDateTo)) {
    whereClauses.push(" DATE(p.purchaseDate) <= '".concat(data.purchaseDateTo, "' "));
  }

  if (data.travelerName) {
    whereClauses.push(" (p.travelerFirstname LIKE '%".concat(utils.sanitize(data.travelerName), "%'\n            OR p.travelerLastname LIKE '%").concat(utils.sanitize(data.travelerName), "%') "));
  }

  if (data.myobAdded && !data.myobChanged) {
    whereClauses.push(" p.myobImport = 'added' ");
  }

  if (data.myobChanged && !data.myobAdded) {
    whereClauses.push(" p.myobImport = 'changed' ");
  }

  if (data.myobAdded && data.myobChanged) {
    whereClauses.push(" (p.myobImport = 'added' OR p.myobImport = 'changed')' ");
  }

  var regularFields = [{
    property: "travelerEmail",
    field: "p.email",
    text: true
  }, {
    property: "bookingPartnerId",
    field: "p.customerID"
  }, {
    property: "userId",
    field: "p.enteredBy",
    text: true
  }, {
    property: "bookingId",
    field: "p.purchaseID"
  }];
  regularFields.map(function (item) {
    if (data[item.property]) {
      if (item.text) {
        whereClauses.push(" ".concat(item.field, " =  '").concat(utils.sanitize(data[item.property]), "' "));
      } else {
        whereClauses.push(" ".concat(item.field, " =  ").concat(utils.sanitize(data[item.property]), " "));
      }
    }
  });
  var whereClauseSQL = "";

  if (whereClauses.length > 0) {
    whereClauseSQL = "AND " + whereClauses.join(" AND ");
  }

  return whereClauseSQL;
};

module.exports = {
  getMainSearchSQL: getMainSearchSQL,
  getSearchSQL: getSearchSQL
};