/**
 * Utilities shared across the application
 */

const config = require('./../../../config/config');
const md5 = require('md5');

const DATE_CHECK_REGEXP = /^[\d]{4}-[\d]{2}-[\d]{2}$/;
const DATE_CHECK_REGEXP_OBJECT = new RegExp(DATE_CHECK_REGEXP);

// Allowed cities
const CITIES_CHECK_REGEXP = /^(Sydney|Melbourne)$/;

// Days of week
const DAYS_OF_WEEK_CHECK_REGEXP = /^(mon|tue|wed|thu|fri|sat|sun)$/;

/**
 * Commonly used as a middleware in order to forbid unathorized users
 * from accessing the route or group of routes
 */
const protectedRouteCheck = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.status(401).send(`Unauthorized`);
    }
};

/**
 * Returns conventional representation of date
 * 
 * @param {Number} year  Year
 * @param {Number} month Month
 * @param {Number} day   Day
 * 
 * @returns {String}
 */
const toStandardDate = (year, month, day) => {
    let result = `${year}-${ (month < 10 ? `0${month}` : month) }-${ (day < 10 ? `0${day}` : day) }`;
    if (DATE_CHECK_REGEXP_OBJECT.test(result)) {
        return result;
    } else {
        throw new Error(`Unable to covert date into the conventional representation`);
    }
};

/**
 * Extracts pagination settings from request
 * 
 * @param {Object} data Filters
 * 
 * @returns {Object}
 */
const getPaginationSettings = (data) => {
    let selectLimit = config.defaultSelectLimit;
    if (`limit` in data && parseInt(data.limit) > 0 && parseInt(data.limit) <= config.maximumSelectLimit) {
        selectLimit = parseInt(data.limit);
    }

    let selectOffset = 0;
    if (`page` in data && parseInt(data.page) > 0) {
        selectOffset = (parseInt(data.page * selectLimit));
    }

    let selectOrder = `ASC`;
    if (`order` in data && data.order.length > 0) {
        selectOrder = data.order;
    }

    return { selectLimit, selectOffset, selectOrder };
};

/**
 * Handles the error and delievers it to user
 * 
 * @param {Object}        response Response Express object
 * @param {String|Object} error    Error
 * 
 * @returns {void}
 */
const handleError = (response, error) => {
    const FAILURE = `failure`;
    if (typeof error === `string` || error instanceof String) {
        console.log(error);
        response.status(500).json({
            status: FAILURE,
            errorType: `UNEXPECTED_ERROR_OCCURED`,
            errorMessage: error
        });
    } else if (`isJoi` in error && error.isJoi) {
        // Joi validation error
        response.status(400).json({
            status: FAILURE,
            errorType: `VALIDATION_ERROR`,
            errorMessage: error.toString()
        });
    } else if (`name` in error && error.name && error.name === `MulterError`) {
        // Multer validation error
        response.status(400).json({
            status: FAILURE,
            errorType: `FILE_UPLOAD_ERROR`,
            errorMessage: error.message
        });
    } else if (`sqlState` in error && error.sqlState && `sqlMessage` in error && error.sqlMessage) {
        // SQL error, needs to be reported
        console.error(`ATTENTION: SQL error occured`, error);
        console.trace(`error`);

        response.status(500).json({
            status: FAILURE,
            errorType: error.sqlState,
            errorMessage: `Error occured while working with the database`
        });
    } else if (`isGeneric` in error && error.isGeneric) {
        response.status(error.statusCode).json({
            status: FAILURE,
            errorType: error.errorType,
            errorMessage: error.errorMessage
        });
    } else {
        // Unprocessed error
        console.error(error);

        response.status(500).json({
            status: FAILURE,
            errorType: `UNEXPECTED_ERROR_OCCURED`,
            errorMessage: JSON.stringify(error)
        });
    }
};

/**
 * Cleans up regular string that come from the outside
 * 
 * @param {String} str Sanitized string
 */
const sanitize = (str) => {
    if (!str && str !== ``) throw new Error(`Undefined value was provided`);

    // If Number is provided, convert it to String
    str = '' + str;

    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\" + char;
        }
    });
};

/**
 * Formats float number to currency representation
 * 
 * @param {Number} amount Amoung to format
 * @param {Number} decimalCount Decimals count
 * @param {String} decimal Decimal separator
 * @param {String} thousands Thousands separator
 */
const dollarFormat = (amount, decimalCount = 2, decimal = ".", thousands = ",") => {
    try {
        decimalCount = Math.abs(decimalCount);
        decimalCount = isNaN(decimalCount) ? 2 : decimalCount;
  
        const negativeSign = amount < 0 ? "-" : "";
  
        let i = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString();
        let j = (i.length > 3) ? i.length % 3 : 0;
  
        return `$` + negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : "");
    } catch (e) {
        console.log(e)
    }
};

/**
 * Checks if date has conventional format
 * 
 * @param {String} dateRaw Date
 * 
 * @returns {Boolean}
 */
const dateIsValid = (dateRaw) => {
    if (dateRaw && DATE_CHECK_REGEXP_OBJECT.test(dateRaw)) {
        return true;
    } else {
        return false;
    }
};

/**
 * Hashes the password
 * 
 * @param {String} password Password
 * @param {String} salt     Salt
 * 
 * @returns {String}
 */
const hashPassword = (password, salt) => {
    return md5(md5(password + salt) + salt);
};

/**
 * API erorrs
 */
const errors = {
    NOT_FOUND: {
        isGeneric: true,
        statusCode: 404,
        errorType: `NOT_FOUND`,
        errorMessage: `Not found`
    },
    NOT_AUTHORIZED: {
        isGeneric: true,
        statusCode: 401,
        errorType: `NOT_AUTHORIZED`,
        errorMessage: `Not authorized`
    },
    NOT_SUPPORTED: {
        isGeneric: true,
        statusCode: 404,
        errorType: `NOT_SUPPORTED`,
        errorMessage: `Requested feature is not supported yet`
    }
};

// Maximum number of fecthed items for listing requests
const MAX_NUMBER_OF_FETCHED_ITEMS = 80;

// Diectory where email attachments reside
const EMAIL_ATTACHMENTS_DIR = ``;
//
const  htmlEntities = (str) => {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const  htmlEntities_decode = (str) => {
    return String(str).replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"');
}
module.exports = { CITIES_CHECK_REGEXP, DATE_CHECK_REGEXP, DATE_CHECK_REGEXP_OBJECT,
    DAYS_OF_WEEK_CHECK_REGEXP, MAX_NUMBER_OF_FETCHED_ITEMS, EMAIL_ATTACHMENTS_DIR,
    dateIsValid, toStandardDate, getPaginationSettings, protectedRouteCheck, sanitize, handleError, errors, hashPassword, dollarFormat, htmlEntities, htmlEntities_decode };