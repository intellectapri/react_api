const assert = require('assert');
const request = require('request');
const uuidv1 = require('uuid/v1');
const fs = require('fs');

const config = require('./../config');
const utils = require('./testUtils');

let authCookie = false;
let newItemId = false;

let bookingPartnerDummy = JSON.parse(fs.readFileSync(__dirname + '/data/bookingPartner.json'));

describe('Booking partners module', function () {
    before(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            done();
        });
    });

    it('should list all booking partners', done => {
        request({
            method: 'GET',
            url: `${config.host}bookingPartners?limit=40&page=2`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.total > 150, true);
            assert.equal(response.body.offset, 80);
            assert.equal(response.body.limit, 40);
            assert.equal(response.body.order, `ASC`);
            assert.equal(response.body.orderBy, `name`);
            assert.equal(response.body.data.length, 40);

            request({
                method: 'GET',
                url: `${config.host}bookingPartners?name=ler`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.data.length, 1);
                done();
            });
        });
    });

    it('should create booking partners', done => {
        request({
            method: 'POST',
            url: `${config.host}bookingPartners`,
            json: true,
            headers: { Cookie: authCookie },
            form: bookingPartnerDummy
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.id > 0, true);
            newItemId = response.body.id;

            let bookingPartnerDummyWithWrongData = bookingPartnerDummy;
            bookingPartnerDummyWithWrongData.reservationEmail = '123';
            request({
                method: 'POST',
                url: `${config.host}bookingPartners`,
                json: true,
                headers: { Cookie: authCookie },
                form: bookingPartnerDummy
            }, (error, response) => {
                assert.equal(response.statusCode, 400);
                done();
            });
        });
    });

    it('should list specific booking partner', done => {
        request({
            method: 'GET',
            url: `${config.host}bookingPartners/${newItemId}`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.customerId, newItemId);
            assert.equal(response.body.name, `Test booking partner`);
            done();
        });
    });

    it('should update booking partner', done => {
        let name = 'Changed booking partner name ' + uuidv1();
        request({
            method: 'PUT',
            url: `${config.host}bookingPartners/${newItemId}`,
            json: true,
            headers: { Cookie: authCookie },
            form: {
                name,
                paymentMethod: `invoice`,
                commissionLevel: `25`
            }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            request({
                method: 'GET',
                url: `${config.host}bookingPartners/${newItemId}`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.name.indexOf(name), 0);
                done();
            });
        });
    });

    it('should delete booking partner', done => {
        request({
            method: 'DELETE',
            url: `${config.host}bookingPartners/${newItemId}`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            request({
                method: 'GET',
                url: `${config.host}bookingPartners/${newItemId}`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 404);
                done();
            });
        });
    });

    it('should return commissions', done => {
        request({
            method: 'GET',
            url: `${config.host}bookingPartners/1/commission`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.email, `alexander.shumilov@toptal.com`);
            done();
        });
    });

    it('should return booking partner purchases', done => {
        request({
            method: 'GET',
            url: `${config.host}bookingPartners/1/purchases`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.length, 4);
            assert.equal(response.body[0].customerName, `Testing booking partner`);
            done();
        });
    });

    it('should create booking partner with override prices and retrieve them while getting tour pricing', done => {
        bookingPartnerDummy.name = `Price overrider`;
        bookingPartnerDummy.adultPrice = 100;
        bookingPartnerDummy.infantPrice = 200;
        bookingPartnerDummy.additionalAdultPrice = 300;
        bookingPartnerDummy.reservationEmail = `test@test.com`;

        request({
            method: 'POST',
            url: `${config.host}bookingPartners`,
            json: true,
            headers: { Cookie: authCookie },
            form: bookingPartnerDummy
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.id > 0, true);
            newItemId = response.body.id;

            request({
                method: 'GET',
                url: `${config.host}products/11/tourPricing?bookingPartnerId=${newItemId}&date=2019-05-15`,
                json: true,
                headers: { Cookie: authCookie },
                form: bookingPartnerDummy
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.overriddenByBookingPartner, true);
                assert.equal(response.body.adultPrice, '100.00');
                assert.equal(response.body.childPrice, '0.00');
                done();
            });
        });
    });

});