const assert = require('assert');
const fs = require('fs');
const request = require('request');
const config = require('./../config');
const utils = require('./testUtils');

let authCookie = false;

describe('Uploads module', function () {
    before(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            done();
        });
    });

    it('should upload files', done => {
        let boundary = Math.random();

        let headers = {};
        headers['Cookie'] = authCookie;
        headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
        const formData = { file: fs.createReadStream(__dirname + '/data/product.json'), };
        request({
            method: 'POST',
            url: `${config.host}upload`,
            headers,
            json: true,
            formData
        }, (err, response, body) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.url.indexOf(`product.json`) > -1, true);

            let url = `${process.env.TEST_URL}${response.body.url}`;
            request({
                method: 'GET',
                url,
                headers
            }, (err, response, body) => {
                assert.equal(response.statusCode, 200);
                assert.equal(JSON.parse(response.body).name, `Test product`);
                done();
            });
        });
    });

    it('should not upload files if user is not authorized', done => {
        let boundary = Math.random();

        let headers = {};
        headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
        const formData = { file: fs.createReadStream(__dirname + '/data/product.json'), };
        request({
            method: 'POST',
            url: `${config.host}upload`,
            headers,
            json: true,
            formData
        }, (err, response, body) => {
            assert.equal(response.statusCode, 401);
            done();
        });
    });

    it('should not upload too big files', done => {
        let boundary = Math.random();

        let headers = {};
        headers['Cookie'] = authCookie;
        headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
        const formData = { file: fs.createReadStream(__dirname + '/data/bonzabikes_02-12-2019.sql'), };
        request({
            method: 'POST',
            url: `${config.host}upload`,
            headers,
            json: true,
            formData
        }, (err, response, body) => {
            assert.equal(response.statusCode, 400);
            assert.equal(response.body.errorType, 'FILE_UPLOAD_ERROR');
            assert.equal(response.body.errorMessage, 'File too large' );
            done();
        });
    });
});