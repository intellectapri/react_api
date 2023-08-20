/**
 * Test utilities
 */

require('dotenv').config();

const request = require('request');
const config = require('./../config');

const authorize = () => {
    let result = new Promise((resolve) => {
        request({
            method: 'POST',
            url: `${config.host}auth`,
            json: true,
            form: {
                login: config.userLogin,
                password: config.userPassword
            }
        }, (error, response) => {
            resolve(response.headers['set-cookie'][0].split(`;`)[0]);
        });
    });

    return result;
};

module.exports = { authorize };