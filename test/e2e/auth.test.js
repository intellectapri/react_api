
var assert = require('assert');
var request = require('request');

const config = require('./../config');

describe('Authorization module', function () {
    it('should be able to authorize users with valid credentials, check the authorization status and destroy session', (done) => {
        request({
            method: 'POST',
            url: `${config.host}auth`,
            json: true,
            form: {
                login: config.userLogin,
                password: config.userPassword
            }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.firstname, `Aleksandr`);
            assert.equal(response.body.lastname, `Shumilov`);

            let authCookie = response.headers['set-cookie'][0].split(`;`)[0];
            request({
                method: 'GET',
                url: `${config.host}auth`,
                json: true,
                headers: { Cookie: authCookie },
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.firstname, `Aleksandr`);
                assert.equal(response.body.lastname, `Shumilov`);

                request({
                    method: 'GET',
                    url: `${config.host}auth`,
                    json: true,
                    headers: { Cookie: `wrong-cookie-123` },
                }, (error, response) => {
                    assert.equal(response.statusCode, 401);

                    request({
                        method: 'DELETE',
                        url: `${config.host}auth`,
                        json: true,
                        headers: { Cookie: authCookie },
                    }, (error, response) => {
                        assert.equal(response.body.message.indexOf(`User was signed out`) > -1, true);
                        done();
                    });
                });
            });
        });
    });

    it('should not authorize users with invalid credentials', (done) => {
        request({
            method: 'POST',
            url: `${config.host}auth`,
            json: true,
            form: {
                login: config.userLogin,
                password: config.userPassword + `INVALID`
            }
        }, (error, response) => {
            assert.equal(response.statusCode, 401);

            request({
                method: 'POST',
                url: `${config.host}auth`,
                json: true,
                form: {
                    name: config.userLogin
                }
            }, (error, response) => {
                assert.equal(response.statusCode, 401);
                done();
            });
        });
    });
});