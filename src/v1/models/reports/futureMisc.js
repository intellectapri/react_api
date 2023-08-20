/**
 * Future reports
 */

const moment = require('moment');
const Joi = require('joi');
const utils = require('./../../shared/utils');

const miscPurchases = require('./../purchases/misc');

/**
 * Generate future misc report
 * 
 * @returns {Promise}
 */
const futureMisc = () => {
    return new Promise((resolve, reject) => {
        let currentDate = new Date();

        const getNumberOfDaysInMonth = (anyDateInMonth) => {
            return new Date(anyDateInMonth.getFullYear(), anyDateInMonth.getMonth() + 1, 0).getDate();
        }

        let year = currentDate.getFullYear();
        let month = currentDate.getMonth() + 1;
        let day = currentDate.getDate();

        let countBoxes = 0;
        let daysSoFar = 0;
        let countRows = 0;

        let dayOfWeek = currentDate.getDay();

        let result = {};

        // Previous days bookings
        for (let i = 1; i < dayOfWeek; i++) {
            daysSoFar++;
            countBoxes++;
            result[utils.toStandardDate(year, month, i)] = [];
        }

        let daysInMonth = getNumberOfDaysInMonth(currentDate);

        let getBookingPromises = [];

        // From current till the end of month bookings
        for (let i = day; i <= daysInMonth; i++) {
            daysSoFar++;
            countBoxes++;

            let dateKey = utils.toStandardDate(year, month, i);

            result[dateKey] = [];
            getBookingPromises.push(new Promise((resolve, reject) => {
                miscPurchases.findFutureBookingByDate(dateKey).then(bookingsForThisDay => {
                    bookingsForThisDay.map(booking => {
                        if (booking.tourDate && booking.tourDate === dateKey ||
                            !booking.tourDate && (booking.purchaseDate && booking.purchaseDate === dateKey)) {
                            result[dateKey].push({
                                purchaseID: booking[`purchaseID`],
                                productName: booking[`productName`],
                                qty: booking[`qty`],
                                standalone: (booking.tourDate ? false : true)
                            });
                        }
                    });

                    resolve();
                });
            }));

            if ((countBoxes === 7) && (daysSoFar !== ((dayOfWeek - 1) + daysInMonth))) {
                countBoxes = 0;
                countRows++;
            }
        }

        // Next month bookings
        let nextMonth = 1;
        let nextYear = year + 1;
        if (month !== 12) {
            nextMonth = month + 1;
            nextYear = year;
        }			

        let lastI = 0;
        for (let i = 1; i <= (7 - countBoxes); i++) {
            let dateKey = utils.toStandardDate(nextYear, nextMonth, i);

            result[dateKey] = [];
            getBookingPromises.push(new Promise((resolve, reject) => {
                miscPurchases.findFutureBookingByDate(dateKey).then(bookingsForThisDay => {
                    bookingsForThisDay.map(booking => {
                        if (booking.tourDate && booking.tourDate === dateKey ||
                            !booking.tourDate && (booking.purchaseDate && booking.purchaseDate === dateKey)) {
                            result[dateKey].push({
                                purchaseID: booking[`purchaseID`],
                                productName: booking[`productName`],
                                qty: booking[`qty`],
                                standalone: (booking.tourDate ? false : true)
                            });
                        }
                    });

                    resolve();
                });
            }));

            lastI = i;
        }

        countRows++;
        countBoxes = 0;
        endDay = (((5 - countRows) * 7) + (lastI + 1)); 

        let nextMontDate = new Date(nextYear, nextMonth, 1);
        daysInNextMonth = getNumberOfDaysInMonth(nextMontDate);

        if (daysInNextMonth < endDay) {
            endDay = daysInNextMonth;
        }
        
        for (let i = (lastI + 1); i < endDay; i++) {
            countBoxes++;

            let dateKey = utils.toStandardDate(nextYear, nextMonth, i);

            result[dateKey] = [];
            getBookingPromises.push(new Promise((resolve, reject) => {
                miscPurchases.findFutureBookingByDate(dateKey).then(bookingsForThisDay => {
                    bookingsForThisDay.map(booking => {
                        if (booking.tourDate && booking.tourDate === dateKey ||
                            !booking.tourDate && (booking.purchaseDate && booking.purchaseDate === dateKey)) {
                            result[dateKey].push({
                                purchaseID: booking[`purchaseID`],
                                productName: booking[`productName`],
                                qty: booking[`qty`],
                                standalone: (booking.tourDate ? false : true)
                            });
                        }
                    });

                    resolve();
                });
            }));

            if((countBoxes === 7) && (i < endDay - 7)) {
                countBoxes = 0;
                countRows++;
            }
        }

        Promise.all(getBookingPromises).then(() => {
            let keys = Object.keys(result);
            keys.sort();

            let sorted = {};
            for (let i = 0; i < keys.length; i++) {
                sorted[keys[i]] = result[keys[i]];
            }

            resolve(sorted);
        }).catch(errors => {
            reject(errors);
        })
    });
};

/**
 * Exported version of the future misc report (CSV)
 * 
 * @returns {Promise}
 */
const futureMiscExport = () => {
    return new Promise((resolve, reject) => {
        let c = ","; let s = '"'; let nl = "\n";

        let str = "";
        str = str + "Delivery Date"+ c;
        str = str + "Bonza Booking ID"+ c;
        str = str + "Product"+ c;
        str = str + "Quantity" + nl

        let currentDate = new Date();
        let currentDateFormatted = utils.toStandardDate(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
        miscPurchases.findFutureBooking(currentDateFormatted).then(bookings => {
            bookings.map(line => {
                if (line.tourDate) {
                    let tourDate = new Date(line[`tourDate`]);
                    str = str + moment(tourDate).format('DD/MM/YYYY') + c;
                    str = str + s + line["purchaseID"] + s + c;
                    str = str + s + line["productName"] + s + c;
                    str = str + s + line["qty"] + s + nl;
                } else {
                    let purchaseDate = new Date(line[`purchaseDate`]);
                    str = str + moment(purchaseDate).format('DD/MM/YYYY') + c;
                    str = str + s + line["purchaseID"] + s + c;
                    str = str + s + line["productName"] + s + c;
                    str = str + s + line["qty"] + s + nl;
                }
            });

            resolve(str);
        });
    });
};

module.exports = { futureMisc, futureMiscExport };
