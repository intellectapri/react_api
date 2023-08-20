var seed = require('./../seedDatabase');
var assert = require('assert');
var request = require('request');
var config = require('./../config');
var utils = require('./testUtils');

let authCookie = false;

describe('Purchases search', function () {
    this.timeout(180000);

    before(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            seed().then(done);
        });
    });

    it('should search in purchases without any filters', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.total, 2541);
            done();
        });
    });

    it('should search for tour purchases for check-in page', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases/checkins?date=2018-11-14`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);

            assert.equal(response.body.booked[`product_11`].totalBooked, 14);
            assert.equal(response.body.booked[`product_11`].times[`10:30:00`][`English`].length, 6);

            assert.equal(response.body.booked[`product_41`].totalBooked, 2);
            assert.equal(response.body.booked[`product_41`].times[`15:15:00`][`English`].length, 1);

            assert.equal(response.body.booked[`product_51`].totalBooked, 2);
            assert.equal(response.body.purchases[3].enteredByName, `Steven Barnard`);
            assert.equal(response.body.purchases.length, 8);
            done();
        });
    });

    it('should contain search result metadata', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.total, 2541);
            assert.equal(response.body.offset, 0);
            assert.equal(response.body.limit, 20);
            assert.equal(response.body.order, `ASC`);
            assert.equal(response.body.orderBy, `tourDate`);
            done();
        });
    });

    it('should sort by product column and take into account order', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?sortBy=product&order=DESC`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data[0].productName, `Water (9)`);

            request({
                method: 'GET',
                url: `${config.host}purchases?sortBy=product&order=ASC`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.data[0].productName.trim(), `Custom Tour - Sydney`);
                done();
            });
        });
    });

    it('should sort by number of adults column and take into account order', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?sortBy=noOfAdult&order=DESC`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data[0].noOfAdult, 44);

            request({
                method: 'GET',
                url: `${config.host}purchases?sortBy=noOfAdult&order=ASC`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.data[0].noOfAdult, 0);
                done();
            });
        });
    });

    it('should sort by purchase date column and take into account order', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?sortBy=purchaseDate&order=DESC`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data[0].purchaseDate, `2019-02-07T03:58:22.000Z`);

            request({
                method: 'GET',
                url: `${config.host}purchases?sortBy=purchaseDate&order=ASC`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.data[0].purchaseDate, `2018-06-01T00:00:00.000Z`);
                done();
            });
        });
    });

    it('should sort by entered by column, take into account order, limit and offset', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?sortBy=enteredBy&order=DESC`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data[0].enteredBy, 192);
            assert.equal(response.body.data[0].enteredAt, null);
            assert.equal(response.body.data[0].updatedBy, null);
            assert.equal(response.body.data[0].updatedAt, null);

            request({
                method: 'GET',
                url: `${config.host}purchases?sortBy=enteredBy&order=ASC`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.data[0].firstname, null);
                assert.equal(response.body.data[0].lastname, null);

                request({
                    method: 'GET',
                    url: `${config.host}purchases?sortBy=enteredBy&order=DESC&limit=12&page=0`,
                    json: true,
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.body.data.length, 12);
                    assert.equal(response.body.data[0].purchaseID, 44287);
                    assert.equal(response.body.data[1].purchaseID, 45578);
                    
                    request({
                        method: 'GET',
                        url: `${config.host}purchases?sortBy=enteredBy&order=DESC&limit=4&page=2`,
                        json: true,
                        headers: { Cookie: authCookie }
                    }, (error, response) => {
                        assert.equal(response.body.data.length, 4);
                        assert.equal(response.body.data[0].purchaseID, 43722);
                        assert.equal(response.body.data[1].purchaseID, 44782);
                        assert.equal(response.body.data[2].purchaseID, 45552);
                        assert.equal(response.body.data[3].purchaseID, 45406);
                        done();
                    });
                });
            });
        });
    });

    it('should search in purchases with purchaseTour filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?purchaseTour=1`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.total, 2321);
            done();
        });
    });

    it('should search in purchases with purchaseMisc filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?purchaseMisc=1&limit=250`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 220);
            assert.equal(response.body.total, 220);
            done();
        });
    });

    it('should search in purchases with purchaseTour and purchaseMisc filters', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?purchaseTour=1&purchaseMisc=1`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.total, 2541);
            done();
        });
    });

    it('should search in purchases with name filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?travelerName=eller`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 6);
            assert.equal(response.body.total, 6);
            done();
        });
    });

    it('should search in purchases with travelerEmail filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?travelerEmail=apotheek.plaskie@skynet.be`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 1);
            assert.equal(response.body.total, 1);
            done();
        });
    });

    it('should search in purchases with purchaseFromDate and purchaseToDate filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?purchaseDateFrom=2018-11-01&purchaseDateTo=2018-11-01`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 11);
            assert.equal(response.body.total, 11);
            done();
        });
    });

    it('should search in purchases with tourDateFrom and tourDateTo filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?tourDateFrom=2018-11-01&tourDateTo=2018-11-02&page=0`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 12);
            assert.equal(response.body.total, 12);
            done();
        });
    });

    it('should search in purchases with productId filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?productId=41`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 20);
            assert.equal(response.body.total, 339);
            done();
        });
    });

    it('should search in purchases with bookingId filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?bookingId=45609`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 1);
            assert.equal(response.body.total, 1);
            done();
        });
    });
    
    it('should search in purchases with bookingRefId filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?bookingRefId=Hollister%20Custom%20Tour%201`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 1);
            assert.equal(response.body.total, 1);
            done();
        });
    });

    it('should search in purchases with bookingPartnerId filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?bookingPartnerId=1`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 4);
            assert.equal(response.body.total, 4);
            done();
        });
    });

    it('should search in purchases with userId filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?userId=2`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 19);
            assert.equal(response.body.total, 19);
            done();
        });
    });

    it('should search in purchases with status filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?status=refunded`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 20);
            assert.equal(response.body.total, 278);
            done();
        });
    });    

    it('should search in purchases with family filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?family=1`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 20);
            assert.equal(response.body.total, 170);
            done();
        });
    });

    it('should search in purchases with travelagency filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?travelagency=te`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 20);
            assert.equal(response.body.total, 31);
            done();
        });
    });

    it('should search in purchases with famils filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?famils=1`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 19);
            assert.equal(response.body.total, 19);
            done();
        });
    });
});