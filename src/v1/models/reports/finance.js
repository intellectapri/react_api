/**
 * Finance reports
 */

const moment = require('moment');

const tourPurchases = require('./../purchases/tour');
const miscPurchases = require('./../purchases/misc');

/**
 * Generate finance report for tour purchases
 * 
 * @param {Object} data Report settings
 * 
 * @returns {Promise}
 */
const finance = (data) => {
    return tourPurchases.financialAnalysis(data);
};

/**
 * Generate finance report for tour purchases
 * 
 * @param {Object} data Report settings
 * 
 * @returns {Promise}
 */
const financeExport = (data) => {
    return new Promise((resolve, reject) => {
        let c = ","; let s = '"'; let nl = "\n";

        let str = "";
        str = str + "Accounts Status" + c;
        str = str + "Tour Month" + c;
        str = str + "Tour Date" + c;
        str = str + "Tour Day" + c;
        str = str + "Tour Type" + c;
        str = str + "Traveller Name" + c;
        str = str + "Traveller Email" + c;
        str = str + "Country" + c;
        str = str + "Adults" + c;
        str = str + "Adult Price" + c;
        str = str + "Children" + c;
        str = str + "Child Price" + c;
        str = str + "Family" + c;
        str = str + "Family Price" + c;
        str = str + "Additional Adults" + c;
        str = str + "Additional Adult Price" + c;
        str = str + "Additional Child" + c;
        str = str + "Additional Child Price" + c;
        str = str + "Gross Sale" + c;
        str = str + "Booking Source" + c;
        str = str + "Customer Name" + c;
        str = str + "Travel Agency" + c;
        str = str + "Purchase Date" + c;
        str = str + "Status" + c;
        str = str + "Entered By" + c;
        str = str + "Bonza Booking ID" + c;
        str = str + "Booking Reference ID" + nl;	

        tourPurchases.financialAnalysis(data).then(results => {
            results.map(line => {
                let tourDate = new Date(line[`tourDate`]);
                let purchaseDate = new Date(line[`purchaseDate`]);

                let myobStat = ``;
                switch (line["myobImport"]) {
                    case 'notadded': myobStat = 'Not Added'; break;
                    case 'changed': myobStat = 'Changed'; break;
                    case 'added': myobStat = 'Added'; break;
                }

                str = str + s +  myobStat + s + c;
                str = str + s + moment(tourDate).format(`MMMM-YY`) + s + c;
                str = str + s + moment(tourDate).format(`DD-MMM-YY`) + s + c;
                str = str + s + moment(tourDate).format(`dddd`) + s + c;
                str = str + s + line['productName'] + s + c;
                str = str + s + line['travelerLastname'] + s + c;
                str = str + s + line['email'] + s + c;
                str = str + s + line['originCountry'] + s + c;
                str = str + line['noOfAdult'] + c;
                str = str + s + parseFloat(line['adultPrice']).toFixed(2) + s + c;
                str = str + line['noOfChildren'] + c;
                str = str + s + parseFloat(line['childPrice']).toFixed(2) + s + c;
                str = str + line['noOfFamilyGroups'] + c;
                str = str + s + parseFloat(line['familyRate']).toFixed(2) + s + c;
                str = str + (line['noOfAddAdult'] ? line['noOfAddAdult'] : 0)  + c;
                str = str + s + parseFloat(line['additionalRate']).toFixed(2) + s + c;
                str = str + (line['noOfAddChildren'] ? line['noOfAddChildren'] : 0) + c;
                str = str + s + parseFloat(line['additionalRate']).toFixed(2) + s + c;
                str = str + s + parseFloat(line['totalGross']).toFixed(2) + s + c;
                str = str + s + line['bookingSource'] + s + c;
                str = str + s + line['customerName'] + s + c;
                str = str + s + line['travelAgency'] + s + c;
                str = str + s + moment(purchaseDate).format(`DD-MMM-YYYY`) + s + c;
                str = str + s + line['status'] + s + c;
                str = str + s + line['staffName'] + s + c;
                str = str + line['purchaseID'] + c;
                str = str + line['bookingRefID'] + nl;
            });

            resolve(str);
        });
    });
};

/**
 * Generate finance report for misc purchases
 * 
 * @param {Object} data Report settings
 * 
 * @returns {Promise}
 */
const financeMisc = (data) => {
    let result = miscPurchases.financialAnalysis(data);
    return result;
};

/**
 * Generate finance report for misc purchases
 * 
 * @param {Object} data Report settings
 * 
 * @returns {Promise}
 */
const financeMiscExport = (data) => {
    return new Promise((resolve, reject) => {
        let c = ","; let s = '"'; let nl = "\n";

        let str = "";
        str = str + "Delivery date" + c;
        str = str + "Quantity" + c;
        str = str + "Price" + c;
        str = str + "Standalone" + c;
        str = str + "Bonza Booking ID" + c;
        str = str + "Tour Month" + c;
        str = str + "Tour Date" + c;
        str = str + "Tour Day" + c;
        str = str + "Tour Type" + c;
        str = str + "Traveller Name" + c;
        str = str + "Country" + c;
        str = str + "Adults" + c;
        str = str + "Adult Price" + c;
        str = str + "Children" + c;
        str = str + "Child Price" + c;
        str = str + "Family" + c;
        str = str + "Family Price" + c;
        str = str + "Additional Adults" + c;
        str = str + "Additional Adult Price" + c;
        str = str + "Additional Child" + c;
        str = str + "Additional Child Price" + c;
        str = str + "Gross Sale" + c;
        str = str + "Booking Source" + c;
        str = str + "Customer Name" + c;
        str = str + "Travel Agency" + c;
        str = str + "Purchase Date" + c;
        str = str + "Status" + c;
        str = str + "Entered By" + c;
        str = str + "Booking Reference ID" + nl;	

        miscPurchases.financialAnalysis(data, true).then(results => {
            results.map(line => {
                let tourDate = new Date(line[`tourDate`]);
                let purchaseDate = new Date(line[`purchaseDate`]);

                str = str + s + (line.tourDate ? moment(line.tourDate).format(`YYYY-MM-DD`) : moment(line.purchaseDate).format(`YYYY-MM-DD`)) + s + c;
                str = str + s + (line.qty) + s + c;
                str = str + s + (line.price) + s + c;
                str = str + s + (line.standalone ? `1` : `0`) + s + c;
                str = str + line['purchaseID'] + c;
                str = str + s + moment(tourDate).format(`MMMM-YY`) + s + c;
                str = str + s + moment(tourDate).format(`DD-MMM-YY`) + s + c;
                str = str + s + moment(tourDate).format(`dddd`) + s + c;
                str = str + s + line['productName'] + s + c;
                str = str + s + line['travelerLastname'] + s + c;
                str = str + s + line['originCountry'] + s + c;
                str = str + line['noOfAdult'] + c;
                str = str + s + (line['adultPrice'] ? parseFloat(line['adultPrice']).toFixed(2) : `null`) + s + c;
                str = str + line['noOfChildren'] + c;
                str = str + s + (line['childPrice'] ? parseFloat(line['childPrice']).toFixed(2) : `null`) + s + c;
                str = str + line['noOfFamilyGroups'] + c;
                str = str + s + (line['familyRate'] ? parseFloat(line['familyRate']).toFixed(2) : `null`) + s + c;
                str = str + (line['noOfAddAdult'] ? line['noOfAddAdult'] : 0)  + c;
                str = str + s + (line['additionalRate'] ? parseFloat(line['additionalRate']).toFixed(2) : `null`) + s + c;
                str = str + (line['noOfAddChildren'] ? line['noOfAddChildren'] : 0) + c;
                str = str + s + (line['additionalRate'] ? parseFloat(line['additionalRate']).toFixed(2) : `null`) + s + c;
                str = str + s + (line['totalGross'] ?  parseFloat(line['totalGross']).toFixed(2) : `null`) + s + c;
                str = str + s + line['bookingSource'] + s + c;
                str = str + s + line['customerName'] + s + c;
                str = str + s + line['travelAgency'] + s + c;
                str = str + s + moment(purchaseDate).format(`DD-MMM-YYYY`) + s + c;
                str = str + s + line['status'] + s + c;
                str = str + s + line['staffName'] + s + c;
                str = str + line['bookingRefID'] + nl;
            });

            resolve(str);
        });
    });
};

module.exports = { finance, financeExport, financeMisc, financeMiscExport };