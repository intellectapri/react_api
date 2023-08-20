const assert = require('assert');
const request = require('request');
const moment = require('moment');
const fs = require('fs');

var config = require('./../config');
var utils = require('./testUtils');

let authCookie = false;
describe('Allotments module', function () {
    before(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            done();
        });
    });

    it('should list allotments', done => {
        request({
            method: 'GET',
            url: `${config.host}allotments?range=3%3A3&productId=11`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.length > 109, true);

            request({
                method: 'GET',
                url: `${config.host}allotments?range=3%3A9&productId=11`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.length > 100, true);
                done();
            });
        });
    });
    
    it('should list allotments in calendar-ready view', done => {
        request({
            method: 'GET',
            url: `${config.host}allotments/events?range=3%3A18&productId=11`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            let totalNumber = 0;
            for (let key in response.body.data) {
                for (let subKey in response.body.data[key]) {
                    totalNumber = totalNumber + response.body.data[key][subKey].length;
                }
            }

            assert.equal(response.body[`2019`][`9`][`7`].text, `0 / 60`);
            assert.equal(response.body[`2019`][`9`][`9`].text, `2 / 60`);
            done();
        });
    });

    it('should check if specific product is available on specific date', done => {
        request({
            method: 'GET',
            url: `${config.host}allotments/available?date=2018-12-12&productId=11`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.available, 57);
            done();
        });
    });

    it('should check if specific product is overbooked', done => {
        request({
            method: 'GET',
            url: `${config.host}allotments/overbooked?total=10&startDate=2018-12-10&endDate=2018-12-14&date=2018-12-12&productId=11&allotmentDay=mon,tue`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            done();
        });
    });

    it('should create and update allotments', done => {
        let currentDate = new Date();
        let startDate = moment(currentDate).subtract(14, 'days').format(`YYYY-MM-DD`);
        let endDate = moment(currentDate).add(14, 'days').format(`YYYY-MM-DD`);
        request({
            method: 'POST',
            url: `${config.host}allotments`,
            json: true,
            form: {
                total: 100,
                startDate,
                endDate,
                productId: 11,
                allotmentDay: `mon,tue,wed`,
                override: 1
            },
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);

            request({
                method: 'GET',
                url: `${config.host}allotments/events?range=3%3A6&productId=11`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                const mondayDay = moment().day(1).toDate();
                const tuesdayDay = moment().day(2).toDate();
                assert.equal(response.statusCode, 200);
                assert.equal(response.body[mondayDay.getFullYear()][mondayDay.getMonth() + 1][mondayDay.getDate()].total, 100);
                assert.equal(response.body[tuesdayDay.getFullYear()][tuesdayDay.getMonth() + 1][tuesdayDay.getDate()].total, 100);
                done();
            });
        });
    });
});