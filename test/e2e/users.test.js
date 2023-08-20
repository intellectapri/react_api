var assert = require('assert');
var request = require('request');
var uuidv1 = require('uuid/v1');
var config = require('./../config');
var utils = require('./testUtils');

let authCookie = false;
let newUserId = false;

describe('Users module', function () {
    before(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            done();
        });
    });

    it('should list all users', done => {
        request({
            method: 'GET',
            url: `${config.host}users`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.length > 10, true);
            done();
        });
    });

    it('should create new users', done => {
        request({
            method: 'POST',
            url: `${config.host}users`,
            json: true,
            headers: { Cookie: authCookie },
            form: {
                firstname: 'Test first name',
                lastname: 'Test last name',
                password: 'testpassword',
                email: 'exampleemail@test.com',
                groupID: 1,
                accountEnabled: 1
            }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.id > 0, true);
            newUserId = response.body.id;
            done();
        });
    });

    it('should list specific user', done => {
        request({
            method: 'GET',
            url: `${config.host}users/${newUserId}`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.userId > 0, true);
            assert.equal(response.body.firstname, `Test first name`);
            assert.equal(response.body.lastname, `Test last name`);
            assert.equal(response.body.email, `exampleemail@test.com`);
            assert.equal(response.body.groupID, 1);
            done();
        });
    });

    it('should update users', done => {
        let firstname = 'Changed first name ' + uuidv1();
        let lastname = 'Changed last name' + uuidv1();
        let email = 'a@a.com';
        request({
            method: 'PUT',
            url: `${config.host}users/${newUserId}`,
            json: true,
            headers: { Cookie: authCookie },
            form: { firstname, lastname, email, accountEnabled: 1, groupID: 2 }
        }, (error, response) => {

            assert.equal(response.statusCode, 200);
            request({
                method: 'GET',
                url: `${config.host}users/${newUserId}`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.body.userId > 0, true);
                assert.equal(response.body.firstname, firstname);
                assert.equal(response.body.lastname, lastname);
                assert.equal(response.body.email, email);
                assert.equal(response.body.groupID, 2);
                done();
            });
        });
    });
});