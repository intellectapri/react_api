var assert = require('assert');
var request = require('request');
var fs = require('fs');
var moment = require('moment');

var config = require('./../config');
var utils = require('./testUtils');

let dummyDataTourPurchase = JSON.parse(fs.readFileSync(__dirname + '/data/tourPurchase.json'));
let dummyDataMiscPurchase = JSON.parse(fs.readFileSync(__dirname + '/data/miscPurchase.json'));

let authCookie = false;

let standaloneMiscPurchase = false, complexMiscPurchaseTourDate = false, complexMiscPurchase = false;
let todayFormatted = false, twoWeeksBeforeTodayFormatted = false, twoWeeksAfterTodayFormatted = false;

describe('Reports module', function () {
    before(done => {
        todayFormatted = moment().format(`YYYY-MM-DD`);
        let twoWeeksBeforeToday = moment().subtract(2, `weeks`);
        twoWeeksBeforeTodayFormatted = moment(twoWeeksBeforeToday).format(`YYYY-MM-DD`);
        let twoWeeksAfterToday = moment().add(2, `weeks`);
        twoWeeksAfterTodayFormatted = moment(twoWeeksAfterToday).format(`YYYY-MM-DD`);

        utils.authorize().then(cookie => {
            authCookie = cookie;

            dummyDataMiscPurchase.products[0].qty = 10;
            dummyDataMiscPurchase.products[1].qty = 100;

            request({
                method: 'POST',
                url: `${config.host}purchases/misc`,
                json: true,
                form: dummyDataMiscPurchase,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                standaloneMiscPurchase = response.body;

                let today = moment().utcOffset(600);
                complexMiscPurchaseTourDate = today.add(1, 'weeks');
                dummyDataTourPurchase.tourDate = moment(complexMiscPurchaseTourDate).format(`YYYY-MM-DD`);

                request({
                    method: 'POST',
                    url: `${config.host}purchases/tours`,
                    json: true,
                    form: dummyDataTourPurchase,
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    complexMiscPurchase = response.body;

                    request({
                        method: 'POST',
                        url: `${config.host}purchases/misc/addtotour/${complexMiscPurchase.purchaseId}`,
                        json: true,
                        form: {
                            purchaseDate: dummyDataTourPurchase.tourDate,
                            products: [{
                                productId: 81,
                                price: 4.00,
                                qty: 70,
                            }, {
                                productId: 71,
                                price: 2.00,
                                qty: 6,
                            }],
                        },
                        headers: { Cookie: authCookie }
                    }, (error, response) => {
                        assert.equal(response.statusCode, 200);
                        done();
                    });
                });
            });
        });
    });

    it('should generate future tour purchases report', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/future`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(Object.keys(response.body).length > 0, true);
            done();
        });
    });

    it('should generate future tour purchases report in form of CSV document', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/future/export`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.headers['content-type'], 'application/csv; charset=utf-8');
            assert.equal(response.headers['content-disposition'], 'attachment; filename=future-report.csv');
            assert.equal(response.body.indexOf(`Tour Date,Product,City`), 0);
            done();
        });
    });

    it('should generate future misc purchases report', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/future-misc`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            let todayDate = moment().utcOffset(600).format('YYYY-MM-DD');
            let nextWeekDate = moment(complexMiscPurchaseTourDate).utcOffset(600).format(`YYYY-MM-DD`)

            assert.equal(response.statusCode, 200);
            assert.equal(Object.keys(response.body).length > 0, true);

            let foundItems = 0;
            response.body[todayDate].map(item => {
                if (item.purchaseID === standaloneMiscPurchase.purchaseId) {
                    if (item.qty === 10) {
                        assert.equal(item.standalone, true);
                        foundItems++;
                    }

                    if (item.qty === 100) {
                        assert.equal(item.standalone, true);
                        foundItems++;
                    }
                }
            });

            response.body[nextWeekDate].map(item => {
                if (item.purchaseID === complexMiscPurchase.purchaseId) {
                    if (item.qty === 6) {
                        assert.equal(item.standalone, false);
                        foundItems++;
                    }

                    if (item.qty === 70) {
                        assert.equal(item.standalone, false);
                        foundItems++;
                    }
                }
            });

            assert.equal(foundItems, 4);
            done();
        });
    });

    it('should generate future misc purchases report in form of CSV document', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/future-misc/export`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.headers['content-type'], 'application/csv; charset=utf-8');
            assert.equal(response.headers['content-disposition'], 'attachment; filename=future-report.csv');
            assert.equal(response.body.indexOf(`Delivery Date,Bonza Booking ID,Product,Quantity`), 0);
            done();
        });
    });

    it('should generate payments report', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/payments?from=2018-11-01&to=2018-11-08`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.length, 106);
            done();
        });
    });

    it('should generate payments report in form of CSV document', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/payments/export?from=2018-10-01&to=2018-12-01`,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.headers['content-type'], 'application/csv; charset=utf-8');
            assert.equal(response.headers['content-disposition'], 'attachment; filename=payments-report.csv');
            assert.equal(response.body.length > 0, true);
            assert.equal(response.body.indexOf(`"Added",01/10/2018,44147,amex,"Mike Banffy","Sydney Full Day Bike Hire",01/10/2018,payment,"80.00",`) > 0, true);
            done();
        });
    });

    it('should generate finance report for tour purchases', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/finance-tours?from=2018-10-01&to=2018-11-01`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.length, 231);
            done();
        });
    });

    it('should generate finance report for tour purchases in form of CSV document', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/finance-tours/export?from=2018-10-01&to=2018-11-01`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.headers['content-type'], 'application/csv; charset=utf-8');
            assert.equal(response.headers['content-disposition'], 'attachment; filename=finance-tours-report.csv');
            assert.equal(response.body.indexOf(`Accounts Status,Tour Month,Tour Date`), 0);
            done();
        });
    });

    it('should generate finance report for misc purchases', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/finance-misc?deliveryFrom=${twoWeeksBeforeTodayFormatted}&deliveryTo=${twoWeeksAfterTodayFormatted}`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.length, 4);

            let checked = 0;
            response.body.map(item => {
                if (item.qty === 70) {
                    assert.equal(item.purchaseID, complexMiscPurchase.purchaseId);
                    assert.equal(item.price, `4.00`);
                    assert.equal(item.tourDate === null, false);
                    assert.equal(item.standalone, false);
                    checked++;
                } else if (item.qty === 6) {
                    assert.equal(item.purchaseID, complexMiscPurchase.purchaseId);
                    assert.equal(item.price, `2.00`);
                    assert.equal(item.tourDate === null, false);
                    assert.equal(item.standalone, false);
                    checked++;
                } else if (item.qty === 10) {
                    assert.equal(item.purchaseID, standaloneMiscPurchase.purchaseId);
                    assert.equal(item.price, `2.00`);
                    assert.equal(item.tourDate === null, true);
                    assert.equal(item.standalone, true);
                    checked++;
                } else if (item.qty === 100) {
                    assert.equal(item.purchaseID, standaloneMiscPurchase.purchaseId);
                    assert.equal(item.price, `4.00`);
                    assert.equal(item.tourDate === null, true);
                    assert.equal(item.standalone, true);
                    checked++;
                }
            });

            assert.equal(checked, 4);
            request({
                method: 'GET',
                url: `${config.host}reports/finance-misc?productId=81&deliveryFrom=${twoWeeksBeforeTodayFormatted}&deliveryTo=${todayFormatted}`,
                json: true,
                headers: { Cookie: authCookie },
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.length, 1);
                done();
            });
        });
    });

    it('should generate finance report for misc purchases in form of CSV document', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/finance-misc/export?deliveryFrom=${twoWeeksBeforeTodayFormatted}&deliveryTo=${twoWeeksAfterTodayFormatted}`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.headers['content-type'], 'application/csv; charset=utf-8');
            assert.equal(response.headers['content-disposition'], 'attachment; filename=finance-misc-report.csv');
            assert.equal(response.body.indexOf(`Delivery date,Quantity,Price,Standalone,Bonza Booking ID`), 0);
            done();
        });
    });

    /*
    it('should generate daily sales report', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/daily-sales?from=2018-11-01&to=2018-11-08`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            console.log(response.body);
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.length, 106);
            done();
        });
    });
    
    it('should generate daily sales report in form of CSV document', function(done) {
        request({
            method: 'GET',
            url: `${config.host}reports/payments/export?from=2018-10-01&to=2018-12-01&city=Sydney`,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.headers['content-type'], 'application/csv; charset=utf-8');
            assert.equal(response.headers['content-disposition'], 'attachment; filename=report.csv');
            assert.equal(response.body.length > 0, true);
            done();
        });
    });
    */

});