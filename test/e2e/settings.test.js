
var assert = require('assert');
var request = require('request');

var config = require('./../config');
var utils = require('./testUtils');

let authCookie = false;

describe('Settings module', function () {
    beforeEach(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            done();
        });
    });

    it('should list all application settings', done => {
        request({
            method: 'GET',
            url: `${config.host}settings`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.length, 3);
            done();
        });
    });

    it('should performs bulk update of application settings', done => {
        request({
            method: 'PUT',
            url: `${config.host}settings`,
            json: true,
            headers: { Cookie: authCookie },
            form: {
                settings: [{
                    key: `ADVBOOKING_ACC`,
                    value: 22010
                }, {
                    key: `DEFAULT_EMAIL`,
                    value: `info@bonzabiketours.com`
                }, {
                    key: `ONLINE_BOOKING_CONFIRM_EMAIL`,
                    value: `service@bonzabiketours.com`
                }]
            }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            done();
        });
    });

    it('should not allow unexpected settings', done => {
        request({
            method: 'PUT',
            url: `${config.host}settings`,
            json: true,
            headers: { Cookie: authCookie },
            form: {
                settings: [{
                    key: `ADVBOOKING_ACC`,
                    value: 22010
                }, {
                    key: `DEFAULT_EMAIL_SOME_BAD_KEY`,
                    value: `info@bonzabiketours.com`
                }, {
                    key: `ONLINE_BOOKING_CONFIRM_EMAIL`,
                    value: `service@bonzabiketours.com`
                }]
            }
        }, (error, response) => {
            assert.equal(response.statusCode, 400);
            done();
        });
    });
});