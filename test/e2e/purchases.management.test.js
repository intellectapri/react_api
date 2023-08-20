var fs = require('fs');
var moment = require('moment');
var assert = require('assert');
var request = require('request');
var config = require('./../config');
var utils = require('./testUtils');

let dummyDataTourPurchase = JSON.parse(fs.readFileSync(__dirname + '/data/tourPurchase.json'));
let dummyDataMiscPurchase = JSON.parse(fs.readFileSync(__dirname + '/data/miscPurchase.json'));

let authCookie = false, tourPurchase = false, miscPurchase = false;

describe('Purchases management module', function () {
    this.timeout(180000);

    before(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            done();
        });
    });

    it('should add the tour purchase', done => {
        request({
            method: 'POST',
            url: `${config.host}purchases/tours`,
            json: true,
            form: dummyDataTourPurchase,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.purchaseId > 0, true);
            assert.equal(response.body.detailId > 0, true);
            tourPurchase = response.body;

            request({
                method: 'GET',
                url: `${config.host}purchases/tours/${tourPurchase.purchaseId}`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.purchaseId, tourPurchase.purchaseId);
                assert.equal(response.body.detailId, tourPurchase.detailId);
                assert.equal(response.body.enteredBy, 196);
                assert.equal(response.body.enteredAt.length > 4, true);
                assert.equal(response.body.updatedBy, null);
                assert.equal(response.body.updatedAt, null);
                done();
            });
        });
    });

    it('should get the tour purchase', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases/${tourPurchase.purchaseId}`,
            json: true,
            form: dummyDataTourPurchase,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.purchaseType, 'tour');
            done();
        });
    });

    it('should update the tour purchase', done => {
        dummyDataTourPurchase.purchaseId = tourPurchase.purchaseId;
        dummyDataTourPurchase.tourDate = `2019-01-12`;
        dummyDataTourPurchase.travelerLastname = 'Jackson';

        setTimeout(() => { 
            request({
                method: 'PUT',
                url: `${config.host}purchases/tours/${tourPurchase.detailId}`,
                json: true,
                form: dummyDataTourPurchase,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.status, `success`);
    
                request({
                    method: 'GET',
                    url: `${config.host}purchases/tours/${tourPurchase.purchaseId}`,
                    json: true,
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    assert.equal(response.body.tourDate, `2019-01-12T00:00:00.000Z`);
                    assert.equal(response.body.travelerLastname, `Jackson`);
                    assert.equal(response.body.enteredBy, 196);
                    assert.equal(response.body.enteredAt.length > 4, true);
                    assert.equal(response.body.updatedBy, 196);
                    assert.equal(response.body.updatedAt.length > 4, true);
                    assert.equal(moment(response.body.enteredAt).isBefore(response.body.updatedAt), true);
                    done();
                });
            });
        }, 2000);
    });

    it('should add the standalone misc purchase and update it', done => {
        request({
            method: 'POST',
            url: `${config.host}purchases/misc`,
            json: true,
            form: dummyDataMiscPurchase,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.purchaseId > 0, true);
            miscPurchase = response.body;
            request({
                method: 'GET',
                url: `${config.host}purchases/misc/${miscPurchase.purchaseId}`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.purchaseType, 'misc');
                assert.equal(response.body.productName.indexOf(`Sports Drinks (70)`) > -1, true);
                assert.equal(response.body.productName.indexOf(`Water (6)`) > -1, true);
                assert.equal(response.body.totalGross, `292.00`);
                assert.equal(response.body.commission, `0.00`);
                assert.equal(response.body.totalNet, `292.00`);
                request({
                    method: 'PUT',
                    url: `${config.host}purchases/misc/${miscPurchase.purchaseId}`,
                    json: true,
                    form: {
                        purchaseDate: "28-01-2019",
                        products: [{
                            productId: 71,
                            price: 70.00,
                            qty: 6
                        }]
                    },
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    
                    request({
                        method: 'GET',
                        url: `${config.host}purchases/misc/${miscPurchase.purchaseId}`,
                        json: true,
                        headers: { Cookie: authCookie }
                    }, (error, response) => {
                        assert.equal(response.statusCode, 200);
                        assert.equal(response.body.purchaseType, 'misc');
                        assert.equal(response.body.productName.indexOf(`Sports Drinks (70)`) > -1, false);
                        assert.equal(response.body.productName.indexOf(`Water (6)`) > -1, true);
                        assert.equal(response.body.totalGross, `420.00`);
                        assert.equal(response.body.commission, `0.00`);
                        assert.equal(response.body.totalNet, `420.00`);

                        done();
                    });
                });
            });
        });
    });

    it('should get the misc purchase', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases/${miscPurchase.purchaseId}`,
            json: true,
            form: dummyDataTourPurchase,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.purchaseType, 'misc');
            done();
        });
    });

    it('should add misc purchase to the tour one and update it with recalculation of prices', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases/tours/${tourPurchase.purchaseId}`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.totalGross, `258.00`);
            assert.equal(response.body.commission, `64.50`);
            assert.equal(response.body.totalNet, `193.50`);
            assert.equal(response.body.miscPurchases.total, 0);
            assert.equal(response.body.miscPurchases.items.length, 0);

            request({
                method: 'POST',
                url: `${config.host}purchases/misc/addtotour/${tourPurchase.purchaseId}`,
                json: true,
                form: {
                    purchaseDate: `28-01-2020`,
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
                request({
                    method: 'GET',
                    url: `${config.host}purchases/tours/${tourPurchase.purchaseId}`,
                    json: true,
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    assert.equal(response.body.totalGross, `258.00`);
                    assert.equal(response.body.commission, `64.50`);
                    assert.equal(response.body.totalNet, `193.50`);
                    assert.equal(response.body.miscPurchases.total, 292);
                    assert.equal(response.body.miscPurchases.items.length, 2);

                    assert.equal(parseFloat(response.body.totalGross) + parseFloat(response.body.miscPurchases.total), 550);

                    request({
                        method: 'PUT',
                        url: `${config.host}purchases/misc/${tourPurchase.purchaseId}`,
                        json: true,
                        form: {
                            purchaseDate: `28-01-2020`,
                            products: [{
                                productId: 71,
                                price: 2.00,
                                qty: 1,
                            }],
                        },
                        headers: { Cookie: authCookie }
                    }, (error, response) => {
                        assert.equal(response.statusCode, 200);
                        request({
                            method: 'GET',
                            url: `${config.host}purchases/tours/${tourPurchase.purchaseId}`,
                            json: true,
                            headers: { Cookie: authCookie }
                        }, (error, response) => {
                            assert.equal(response.statusCode, 200);
                            assert.equal(response.body.totalGross, `258.00`);
                            assert.equal(response.body.commission, `64.50`);
                            assert.equal(response.body.totalNet, `193.50`);
                            assert.equal(response.body.miscPurchases.total, 2);
                            assert.equal(response.body.miscPurchases.items.length, 1);

                            assert.equal(parseFloat(response.body.totalGross) + parseFloat(response.body.miscPurchases.total), 260);

                            done();
                        });
                    });
                });
            });
        });
    });

    it('should check if the date is booked', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases/isbookeddate?productId=1&date=12-01-2018`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.isBooked, false);
            done();
        });
    });

    it('should modify the checkin state', done => {
        request({
            method: 'POST',
            url: `${config.host}purchases/${tourPurchase.purchaseId}/checkin`,
            json: true,
            form: {
                value: true
            },
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            done();
        });
    });

    it('should modify the no show state', done => {
        request({
            method: 'POST',
            url: `${config.host}purchases/${tourPurchase.purchaseId}/noshow`,
            json: true,
            form: {
                value: true
            },
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            done();
        });
    });
});