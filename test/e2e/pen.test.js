/**
 * Testing common vulnerabilities
 */

var assert = require('assert');
var request = require('request');
var config = require('./../config');
var utils = require('./testUtils');

let authCookie = false;

describe('Security policy', function () {
    beforeEach(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            done();
        });
    });

    it('should check submitted parameters', done => {
        request({
            method: 'POST',
            url: `${config.host}users`,
            json: true,
            headers: { Cookie: authCookie },
            form: {
                firstname: 'Test first name "\'',
                password: 'testpassword',
                email: 'exampleemail@test.com'
            }
        }, (error, response) => {
            assert.equal(response.statusCode, 400);
            assert.equal(response.body.errorMessage.indexOf(`"lastname" is required`) > 0, true);
            done();
        });
    });

    it('should not allow special symbols in SQL', done => {
        request({
            method: 'POST',
            url: `${config.host}users`,
            json: true,
            headers: { Cookie: authCookie },
            form: {
                firstname: 'Test first name "\'',
                lastname: 'Test last \' AND name',
                password: 'testpassword',
                email: 'exampleemail@test.com',
                groupID: 1,
                accountEnabled: 1
            }
        }, (error, response) => {
            request({
                method: 'GET',
                url: `${config.host}users/${response.body.id}`,
                json: true,
                headers: { Cookie: authCookie },
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.firstname, `Test first name "\'`);
        
                done();
            });
        });
    });

});