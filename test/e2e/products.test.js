const assert = require('assert');
const request = require('request');
const fs = require('fs');

var config = require('./../config');
var utils = require('./testUtils');

let dummyData = JSON.parse(fs.readFileSync(__dirname + '/data/product.json'));

let authCookie = false;
let newItemId = false;

describe('Products module', function () {
    before(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            done();
        });
    });

    it('should list all products', done => {
        request({
            method: 'GET',
            url: `${config.host}products`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);

            let numberOfActiveProducts = 0;
            response.body.map(item => {
                if (!item.archived) {
                    numberOfActiveProducts++;
                }
            });

            assert.equal(numberOfActiveProducts, 15);
            assert.equal(`productID` in response.body[0] && response.body[0].productID > 0, true);
            done();
        });
    });

    it('should list all products with certain type codes', done => {
        request({
            method: 'GET',
            url: `${config.host}products?typeCodes=HIRES,PACKAGES`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);

            let numberOfActiveProducts = 0;
            response.body.map(item => {
                if (!item.archived) {
                    numberOfActiveProducts++;
                }
            });

            assert.equal(numberOfActiveProducts, 6);
            done();
        });
    });

    it('should list tour pricing for specific booking partner and product', done => {
        request({
            method: 'GET',
            url: `${config.host}products/11/tourPricing?bookingPartnerId=2&date=2018-10-10`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.status, 'success');
            assert.equal(response.body.adultPrice, '129.00');

            request({
                method: 'GET',
                url: `${config.host}products/11/tourPricing?bookingPartnerId=0&date=2018-10-10`,
                json: true,
                headers: { Cookie: authCookie },
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.status, 'success');
                assert.equal(response.body.adultPrice, '129.00');
                done();
            });
        });
    });

    it('should list tour pricing for specific booking partner only', done => {
        request({
            method: 'GET',
            url: `${config.host}products/0/tourPricing?bookingPartnerId=2&date=2018-10-10`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.status, 'empty');
            done();
        });
    });

    it('should create new products and get them', done => {
        request({
            method: 'POST',
            url: `${config.host}products`,
            json: true,
            headers: { Cookie: authCookie },
            form: dummyData
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.id > 0, true);
            newItemId = response.body.id;
            request({
                method: 'GET',
                url: `${config.host}products/${newItemId + 1000}`,
                json: true,
                headers: { Cookie: authCookie },
            }, (error, response) => {
                assert.equal(response.statusCode, 404);
                request({
                    method: 'GET',
                    url: `${config.host}products/${newItemId}`,
                    json: true,
                    headers: { Cookie: authCookie },
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    assert.equal(response.body.name, `Test product`);
                    done();
                });
            });
        });
    });

    it('should update products', done => {
        dummyData.name = `New name for test product`
        request({
            method: 'PUT',
            url: `${config.host}products/${newItemId}`,
            json: true,
            headers: { Cookie: authCookie },
            form: dummyData
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            request({
                method: 'GET',
                url: `${config.host}products/${newItemId}`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.body.name, `New name for test product`);
                done();
            });
        });
    });

    it('should create price seasons for specific product and take seasons into account when reporting product price', done => {
        request({
            method: 'PUT',
            url: `${config.host}products/${newItemId}/seasons`,
            json: true,
            headers: { Cookie: authCookie },
            form: []
        }, (error, response) => {
            assert.equal(response.statusCode, 200);

            request({
                method: 'GET',
                url: `${config.host}products/${newItemId}/seasons`,
                json: true,
                headers: { Cookie: authCookie },
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.length, 0);

                request({
                    method: 'PUT',
                    url: `${config.host}products/${newItemId}/seasons`,
                    json: true,
                    headers: { Cookie: authCookie },
                    form: [
                        {
                            name: `Test season 1`,
                            notes: `Test season 1 notes`,
                            startDate: `2019-10-01`,
                            finishDate: `2019-10-10`,
                            adultRate: 123.5,
                            childRate: false,
                            infantRate: false,
                            familyRate: 400.6,
                            additionalAdultRate: 123.5,
                        },
                        {
                            name: `Test season 2`,
                            notes: `Test season 2 notes`,
                            startDate: `2019-10-15`,
                            finishDate: `2019-10-25`,
                            adultRate: 200.5,
                            childRate: false,
                            infantRate: 100.1,
                            familyRate: 300.6,
                            additionalChildRate: 123.5,
                            seniorConcessionRate: 5
                        }
                    ]
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    assert.equal(response.body.status, `success`);

                    request({
                        method: 'GET',
                        url: `${config.host}products/${newItemId}/seasons`,
                        json: true,
                        headers: { Cookie: authCookie },
                    }, (error, response) => {
                        assert.equal(response.statusCode, 200);
                        assert.equal(response.body.length, 2);
                        response.body.map(season => {
                            if (season.name === `Test season 1`) {
                                assert.equal(season.adultRate, `123.50`);
                                assert.equal(season.childRate, null);
                                assert.equal(season.infantRate, null);
                                assert.equal(season.familyRate, `400.60`);
                                assert.equal(season.additionalAdultRate, `123.50`);
                                assert.equal(season.additionalChildRate, null);
                                assert.equal(season.seniorConcessionRate, null);
                            } else if (season.name === `Test season 2`) {
                                assert.equal(season.adultRate, `200.50`);
                                assert.equal(season.childRate, null);
                                assert.equal(season.infantRate, `100.10`);
                                assert.equal(season.familyRate, `300.60`);
                                assert.equal(season.additionalAdultRate, null);
                                assert.equal(season.additionalChildRate, `123.50`);
                                assert.equal(season.seniorConcessionRate, `5.00`);
                            }
                        });

                        // Get the product price outside of any season
                        request({
                            method: 'GET',
                            url: `${config.host}products/${newItemId}/tourPricing?bookingPartnerId=2&date=2019-09-01`,
                            json: true,
                            headers: { Cookie: authCookie },
                        }, (error, response) => {
                            assert.equal(response.statusCode, 200);
                            assert.equal(response.body.appliedSeasonName, false);
                            assert.equal(response.body.adultPrice, '123.00');
                            assert.equal(response.body.childPrice, '123.00');
                            assert.equal(response.body.familyRate, '123.00');
                            assert.equal(response.body.additionalRate, '123.00');
                            assert.equal(response.body.infantRate, '0.00');
                            assert.equal(response.body.seniorConsessionRate, '0.00');

                            // Get the product price in season 1
                            request({
                                method: 'GET',
                                url: `${config.host}products/${newItemId}/tourPricing?bookingPartnerId=2&date=2019-10-01`,
                                json: true,
                                headers: { Cookie: authCookie },
                            }, (error, response) => {
                                assert.equal(response.statusCode, 200);
                                assert.equal(response.body.appliedSeasonName, `Test season 1`);
                                assert.equal(response.body.adultPrice, '123.50');
                                assert.equal(response.body.childPrice, '0.00');
                                assert.equal(response.body.familyRate, '400.60');
                                assert.equal(response.body.additionalRate, '123.50');
                                assert.equal(response.body.infantRate, '0.00');
                                assert.equal(response.body.seniorConsessionRate, '0.00');

                                // Get the product price in season 2
                                request({
                                    method: 'GET',
                                    url: `${config.host}products/${newItemId}/tourPricing?bookingPartnerId=2&date=2019-10-25`,
                                    json: true,
                                    headers: { Cookie: authCookie },
                                }, (error, response) => {
                                    assert.equal(response.statusCode, 200);
                                    assert.equal(response.body.appliedSeasonName, `Test season 2`);
                                    assert.equal(response.body.adultPrice, '200.50');
                                    assert.equal(response.body.childPrice, '0.00');
                                    assert.equal(response.body.familyRate, '300.60');
                                    assert.equal(response.body.additionalRate, '0.00');
                                    assert.equal(response.body.infantRate, '100.10');
                                    assert.equal(response.body.seniorConsessionRate, '0.00');

                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    it('should update products order', done => {
        request({
            method: 'GET',
            url: `${config.host}products`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);

            request({
                method: 'PUT',
                url: `${config.host}products/order`,
                json: true,
                headers: { Cookie: authCookie },
                form: [{
                    productID: 71,
                    displayOrder: 2
                }, {
                    productID: 191,
                    displayOrder: 3
                }]
            }, (error, response) => {
                assert.equal(response.statusCode, 200);

                request({
                    method: 'GET',
                    url: `${config.host}products`,
                    json: true,
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);

                    response.body.map(item => {
                        if (item.productID === 71) assert.equal(item.displayOrder, '2');
                        if (item.productID === 191) assert.equal(item.displayOrder, '3');
                    });

                    done();
                });
            });
        });
    });

    it('should archive products', done => {
        request({
            method: 'GET',
            url: `${config.host}products`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            let numberOfActiveProducts = 0;
            response.body.map(item => {
                if (!item.archived) {
                    numberOfActiveProducts++;
                }
            });

            assert.equal(numberOfActiveProducts, 16);

            request({
                method: 'DELETE',
                url: `${config.host}products/${newItemId}`,
                json: true,
                headers: { Cookie: authCookie },
            }, (error, response) => {
                assert.equal(response.statusCode, 200);            
                request({
                    method: 'GET',
                    url: `${config.host}products`,
                    json: true,
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    let numberOfActiveProducts = 0;
                    response.body.map(item => {
                        if (!item.archived) {
                            numberOfActiveProducts++;
                        }
                    });
        
                    assert.equal(numberOfActiveProducts, 15);
                    done();
                });
            });
        });
    });
});