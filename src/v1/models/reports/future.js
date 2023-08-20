/**
 * Future reports
 */

const moment = require('moment');
const Joi = require('joi');
const utils = require('./../../shared/utils');

const tourPurchases = require('./../purchases/tour');

/**
 * Generate future report
 * 
 * @param {Object} data Report settings
 * 
 * @returns {Promise}
 */
const future = (data) => {
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
                tourPurchases.findFutureBookingByDate(dateKey).then(bookingsForThisDay => {
                    bookingsForThisDay.map(booking => {
                        result[dateKey].push(booking);
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
                tourPurchases.findFutureBookingByDate(dateKey).then(bookingsForThisDay => {
                    bookingsForThisDay.map(booking => {
                        result[dateKey].push({
                            productName: booking[`productName`],
                            totalGuest: booking[`totalGuest`],
                            totalAllotment: booking[`totalAllotment`]
                        });
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
                tourPurchases.findFutureBookingByDate(dateKey).then(bookingsForThisDay => {
                    bookingsForThisDay.map(booking => {
                        result[dateKey].push({
                            productName: booking[`productName`],
                            totalGuest: booking[`totalGuest`],
                            totalAllotment: booking[`totalAllotment`]
                        });
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
 * Exported version of the future report (CSV)
 * 
 * @param {Object} data Report settings
 * 
 * @returns {Promise}
 */
const futureExport = (data) => {
    return new Promise((resolve, reject) => {
        const schema = Joi.object().keys({ city: Joi.string().regex(utils.CITIES_CHECK_REGEXP) });
        Joi.validate(data, schema).then(() => {
            let c = ","; let s = '"'; let nl = "\n";
            let str = "";

            str = str + "Tour Date"+ c;
            str = str + "Product"+ c;
            str = str + "City"+ c;
            str = str + "Traveler Name"+ c;
            str = str + "Adults"+ c;
            str = str + "Children"+ c;
            str = str + "Family"+ c;
            str = str + "Additionals"+ c;
            str = str + "Babies"+ c;
            str = str + "Total Riders"+ c;
            str = str + "Amount Owing"+ c;
            str = str + "Phone"+ c;
            str = str + "Hotel"+ c;
            str = str + "Additional Names"+ c;
            str = str + "Baby seats"+ c;
            str = str + "Trail alongs"+ c;
            str = str + "Small kids"+ c;
            str = str + "Large kids"+ c;
            str = str + "MYOB"+ c;
            str = str + "Internal notes"+ c;
            str = str + "Guest notes" + nl;	

            let currentDate = new Date();
            let currentDateFormatted = utils.toStandardDate(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
            tourPurchases.findFutureBooking(currentDateFormatted).then(bookings => {
                bookings.map(line => {
                    let tourDate = new Date(line[`tourDate`]);
                    str = str + moment(tourDate).format('DD/MM/YYYY') + c;
                    str = str + s + line["productName"] + s + c;
                    str = str + line["tourCity"] + c;
                    str = str + s + line["travelerLastname"] + s + c;
                    str = str + line["noOfAdult"] + c;
                    str = str + line["noOfChildren"] + c;
                    str = str + line["noOfFamilyGroups"] + c;
                    str = str + line["noOfAdditionals"] + c;
                    str = str + line["noOfBabies"] + c;
                    str = str + ((parseInt(line["family"]) === 1) ? parseInt(line["noOfFamilyGroups"]) * 4 + parseInt(line["noOfAdditionals"]) : parseInt(line["noOfAdult"]) + parseInt(line["noOfChildren"])) + c;
                    str = str + s + (parseInt(line["totalNet"]) - parseInt(line["totalPaid"])) + s+ c;
                    str = str + line["phone"] + c;
                    str = str + s + line["hotel"] + s+ c;
                    str = str + s + line["additionalNames"] + s+ c;
                    str = str + line["babySeats"] + c;
                    str = str + line["trailAlongs"] + c;
                    str = str + line["smallKidsBikes"] + c;
                    str = str + line["largeKidsBikes"] + c;
                    str = str + s + line["myob"] + s + c;
                    str = str + s + line["internalNotes"] + s + c;
                    str = str + s + line["guestNote"] + s + nl;
                });

                resolve(str);
            });
        }).catch(errors => {
            reject(errors);
        })
    });
};

module.exports = { future, futureExport };
