var seed = require('./../seedDatabase');
var moment = require('moment');
var assert = require('assert');
var request = require('request');
var config = require('./../config');
var utils = require('./testUtils');

let authCookie = false;
let purchaseId = false;

const tourPurchase = `{"additionalRate":"79","additionalNames":"","adultPrice":"129","babySeats":"0","bookingRefID":"test famils","bookingSource":"Phone","checkIn":"0","childPrice":"99","commission":"92.25","commissionLevel":"25","confirmedByPartner":"0","originCountry":"Australia","customerId":"679","customerNotes":"","email":"","emailTemplate":"CLASSIC-CONF","famils":"1","family":"1","familyRate":"369","guestNote":"","hotel":"","internalNotes":"","language":"English","largeKidsBikes":"0","travelerFirstname":"test famils and family","travelerLastname":"test famils and family","noOfAddChildren":"0","noOfAdditionals":"0","noOfAdult":"2","noOfBabies":"0","noOfChildren":"2","noOfFamilyGroups":"1","noShow":"0","operatorEmail":"","operatorEmail2":"","optionTourTime":"0","overrideTourTime":"","partnerEmail":"","phone":"","productId":"11","purchaseId":"0","sendToGuest":"0","sendToTourOperator":"0","sendToPartner":"0","smallKidsBikes":"0","status":"active","totalGross":"369","totalNet":"276.75","totalRiders":"4","tourCity":"Sydney","trailAlongs":"0","travelAgency":"test famils and family","twoDayRule":"0","userId":"196","voucher":"0","voucherFirstname":"","voucherLastname":"","tourDate":"2019-10-18","city":"Sydney"}`;
const miscPurchase = `{"purchaseDate":"2019-10-04","internalNotes":"","city":null,"products":[{"detailId":"0","productId":"71","price":"4","qty":"4","subtotal":"16"},{"detailId":"0","productId":"181","price":"0","qty":"5","subtotal":"0"}],"total":"16","sendConfirmationToBookingPartner":0,"bookingPartnerEmail":""}`;
const dateRangeFrom = moment().subtract(2, "days").format(`YYYY-MM-DD`);
const dateRangeTo = moment().add(2, "days").format(`YYYY-MM-DD`);

describe('Misc purchases search (taking into account linked tour purchases properties)', function () {
    this.timeout(180000);

    before(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            seed().then(() => {
                // Create tour purchase
                request({
                    method: 'POST',
                    url: `${config.host}purchases/tours`,
                    json: true,
                    headers: { Cookie: authCookie },
                    form: JSON.parse(tourPurchase)
                }, (error, response) => {
                    purchaseId = response.body.purchaseId;

                    // Create linked misc purchase
                    request({
                        method: 'PUT',
                        url: `${config.host}purchases/misc/${purchaseId}`,
                        json: true,
                        headers: { Cookie: authCookie },
                        form: JSON.parse(miscPurchase)
                    }, done);
                });
            });
        });
    });

    it('should search in purchases with booking reference id filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?sortBy=tourDate&order=DESC&purchaseDateFrom=${dateRangeFrom}&purchaseDateTo=${dateRangeTo}&purchaseMisc=1&bookingRefId=test%20famils`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 1);
            assert.equal(response.body.total, 1);
            done();
        });
    });

    it('should search in purchases with travelagency filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?sortBy=tourDate&travelagency=test%20famils&order=DESC&purchaseMisc=1&purchaseDateFrom=${dateRangeFrom}&purchaseDateTo=${dateRangeTo}`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 1);
            assert.equal(response.body.total, 1);
            done();
        });
    });

    it('should search in purchases with traveller name filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?sortBy=tourDate&order=DESC&purchaseDateFrom=${dateRangeFrom}&purchaseDateTo=${dateRangeTo}&purchaseMisc=1&travelerName=test%20famils`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 1);
            assert.equal(response.body.total, 1);
            done();
        });
    });

    it('should search in purchases with famils filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?sortBy=tourDate&order=DESC&purchaseDateFrom=${dateRangeFrom}&purchaseDateTo=${dateRangeTo}&purchaseMisc=1&famils=1`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 1);
            assert.equal(response.body.total, 1);
            done();
        });
    });

    it('should search in purchases with family filter', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?sortBy=tourDate&order=DESC&purchaseDateFrom=${dateRangeFrom}&purchaseDateTo=${dateRangeTo}&purchaseMisc=1&family=1`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data.length, 1);
            assert.equal(response.body.total, 1);
            done();
        });
    });

    it('should change product name depending on requested product type (tour, misc or both)', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases?sortBy=tourDate&order=DESC&purchaseDateFrom=${dateRangeFrom}&purchaseDateTo=${dateRangeTo}&family=1`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.data[0].productName.indexOf('Sydney Classic Tour') > -1, true);
            assert.equal(response.body.data[0].productName.indexOf('Water (4)') > -1, true);
            assert.equal(response.body.data[0].productName.indexOf('Bike Sale (5)') > -1, true);
            assert.equal(response.body.data[0].purchaseType, 'tourmisc');
            request({
                method: 'GET',
                url: `${config.host}purchases?sortBy=tourDate&order=DESC&purchaseDateFrom=${dateRangeFrom}&purchaseDateTo=${dateRangeTo}&purchaseMisc=1&family=1`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.data[0].productName.indexOf('Sydney Classic Tour') > -1, false);
                assert.equal(response.body.data[0].productName.indexOf('Water (4)') > -1, true);
                assert.equal(response.body.data[0].productName.indexOf('Bike Sale (5)') > -1, true);
                assert.equal(response.body.data[0].purchaseType, 'misc');
                request({
                    method: 'GET',
                    url: `${config.host}purchases?sortBy=tourDate&order=DESC&purchaseDateFrom=${dateRangeFrom}&purchaseDateTo=${dateRangeTo}&purchaseTour=1&family=1`,
                    json: true,
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    assert.equal(response.body.data[0].productName.indexOf('Sydney Classic Tour') > -1, true);
                    assert.equal(response.body.data[0].productName.indexOf('Water (4)') > -1, false);
                    assert.equal(response.body.data[0].productName.indexOf('Bike Sale (5)') > -1, false);
                    assert.equal(response.body.data[0].purchaseType, 'tour');
                    done();
                });
            });
        });
    });
});
