var assert = require('assert');
var request = require('request');
var moment = require('moment');
var fs = require('fs');
var config = require('./../config');
var utils = require('./testUtils');

let authCookie = false;
let createdEntityId = false;

let dummyData = JSON.parse(fs.readFileSync(__dirname + '/data/tourPurchase.json'));

describe('Email templates module', function () {
    beforeEach(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            done();
        });
    });

    it('should list all email templates', done => {
        request({
            method: 'GET',
            url: `${config.host}emailTemplates`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.length, 18);
            done();
        });
    });

    it('should create email template', done => {
        let form = {
            templateCode: `NEW_TEMPLATE`,
            title: `New template`,
            standardText: `New standard text`,
            customerText: `New customer text`,
            tourOperatorText: `New tour operator text`,
            voucherText: `New voucher text`,
            subject: `New subject`,
            sendFrom: `test@example.com`
        };

        request({
            method: 'POST',
            url: `${config.host}emailTemplates`,
            json: true,
            headers: { Cookie: authCookie },
            form
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.id > 0, true);
            createdEntityId = response.body.id;

            request({
                method: 'GET',
                url: `${config.host}emailTemplates/${createdEntityId}`,
                json: true,
                headers: { Cookie: authCookie },
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.templateID, createdEntityId);
                assert.equal(response.body.templateCode, form.templateCode);
                assert.equal(response.body.title, form.title);
                assert.equal(response.body.subject, form.subject);
                assert.equal(response.body.sendFrom, form.sendFrom);
                done();
            });
        });
    });

    it('should update email template', done => {
        let form = {
            templateCode: `CHANGED_NEW_TEMPLATE`,
            title: `New template changed`,
            standardText: `New standard text changed`,
            customerText: `New customer text changed`,
            tourOperatorText: `New tour operator text changed`,
            voucherText: `New voucher text changed`,
            subject: `New subject changed`,
            sendFrom: `example@example.com`
        };

        request({
            method: 'PUT',
            url: `${config.host}emailTemplates/${createdEntityId}`,
            json: true,
            headers: { Cookie: authCookie },
            form
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            request({
                method: 'GET',
                url: `${config.host}emailTemplates/${createdEntityId}`,
                json: true,
                headers: { Cookie: authCookie },
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.templateID, createdEntityId);
                assert.equal(response.body.templateCode, form.templateCode);
                assert.equal(response.body.title, form.title);
                assert.equal(response.body.subject, form.subject);
                assert.equal(response.body.sendFrom, form.sendFrom);
                done();
            });
        });
    });

    it('should archive email templates', done => {
        request({
            method: 'GET',
            url: `${config.host}emailTemplates`,
            json: true,
            headers: { Cookie: authCookie },
        }, (error, response) => {


            assert.equal(response.statusCode, 200);
            let initialNumber = response.body.length;

            request({
                method: 'DELETE',
                url: `${config.host}emailTemplates/${response.body[0].templateID}`,
                json: true,
                headers: { Cookie: authCookie },
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.status, `success`);

                request({
                    method: 'GET',
                    url: `${config.host}emailTemplates`,
                    json: true,
                    headers: { Cookie: authCookie },
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    assert.equal(response.body.length, initialNumber - 1);

                    request({
                        method: 'GET',
                        url: `${config.host}emailTemplates?archived=true`,
                        json: true,
                        headers: { Cookie: authCookie },
                    }, (error, response) => {
                        assert.equal(response.statusCode, 200);
                        assert.equal(response.body.length, initialNumber);

                        done();
                    });
                });
            });
        });
    });

    it('should replace template constants with valid text, replace lines if certain constants are empty', done => {
        // Update the template with new constants
        let form = {
            templateCode: `HALFHIRE-CONF`,
            title: `Half Day Bike Hire Confirmation`,
            standardText: `<p>Total Number of Guests: {TOTAL_GUESTS}</p><p>Number of Adults: {NUMBER_OF_ADULTS}</p><p>Number of Children: {NUMBER_OF_CHILDREN}</p><p><strong style="color: black;">Booking Status</strong><span style="color: black;">: {BOOKING_STATUS}</span></p><p>&nbsp;</p><p><span style="color: black;">Thank you for booking a {TOUR_TYPE} with Bonza Bike Tours!</span></p><p><br></p><p><span style="color: black;">Your booking is confirmed.&nbsp;Now that we have your booking in our&nbsp;system, you simply need to arrive at our shop at the time listed below.&nbsp;If you would like to change your pickup time, please contact us to arrange a new pickup time.&nbsp;For your reference, here are the details of your booking:</span></p><p><strong>&nbsp;</strong></p><p><strong style="color: black;">Hire Date</strong><span style="color: black;">: {TOUR_DATE}</span></p><p>&nbsp;</p><p><strong style="color: black;">Hire Type</strong><span style="color: black;">: {TOUR_TYPE}</span></p><p><br></p><p><br></p><p>Number of infants:{NUMBER_OF_INFANTS}</p><p>Additional purchases:{LIST_MISCELLANEOUS_PURCHASES}</p><p><br></p><p><em>Equipment:</em> {LIST_EQUIPMENT}</p><p><br></p><p><strong>Nett sale amount:</strong> {NETT_SALE_AMOUNT}</p><p><br></p><p><br></p><p>Number of families:   {NUMBER_OF_FAMILIES}  </p><p>Additional riders:{ADDITIONAL_RIDERS}</p>`,
            customerText: `New customer text changed`,
            tourOperatorText: `New tour operator text changed`,
            voucherText: `New voucher text changed`,
            subject: `New subject changed`,
            sendFrom: `example@example.com`
        };

        request({
            method: 'PUT',
            url: `${config.host}emailTemplates/121`,
            json: true,
            headers: { Cookie: authCookie },
            form
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            dummyData.noOfBabies = '2';
            dummyData.babySeats = '1';
            dummyData.trailAlongs = '2';
            dummyData.smallKidsBikes = '3';
            dummyData.largeKidsBikes = '4';

            request({
                method: 'POST',
                url: `${config.host}purchases/tours`,
                json: true,
                form: dummyData,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.confirmationSent, 3);
                let tourPurchaseId = response.body.purchaseId;
                let toruDetailId = response.body.detailId;

                request({
                    method: 'POST',
                    url: `${config.host}purchases/misc/addtotour/${tourPurchaseId}`,
                    json: true,
                    form: {
                        purchaseDate: `28-01-2020`,
                        products: [{
                            productId: 81,
                            price: 4.00,
                            qty: 70,
                        }, {
                            productId: 71,
                            price: 2.00,
                            qty: 6,
                        }],
                    },
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);

                    request({
                        method: 'GET',
                        url: `${config.host}purchases/tours/${tourPurchaseId}`,
                        json: true,
                        headers: { Cookie: authCookie }
                    }, (error, response) => {
                        assert.equal(response.statusCode, 200);

                        dummyData.purchaseId = tourPurchaseId;
                        dummyData.travelerLastname = 'Jackson';
                        request({
                            method: 'PUT',
                            url: `${config.host}purchases/tours/${toruDetailId}`,
                            json: true,
                            form: dummyData,
                            headers: { Cookie: authCookie }
                        }, (error, response) => {
                            assert.equal(response.statusCode, 200);

                            setTimeout(() => {
                                request({
                                    method: 'GET',
                                    url: `${config.host}broadcasts?from=${moment().format(`YYYY-MM-DD`)}&to=${moment().format(`YYYY-MM-DD`)}&emailTo=shumsan1011@gmail.com`,
                                    json: true,
                                    headers: { Cookie: authCookie }
                                }, (error, response) => {
                                    assert.equal(response.statusCode, 200);
                                    let latestEmail = response.body.data[0];
                                    if (moment(response.body.data[1].sentDate).isAfter(response.body.data[0].sentDate)) {
                                        latestEmail = response.body.data[1];
                                    }

                                    assert.equal(latestEmail.message.indexOf(`<p>Total Number of Guests: 4</p>`) > -1, true);

                                    assert.equal(latestEmail.message.indexOf(`NUMBER_OF_INFANTS`), -1);
                                    assert.equal(latestEmail.message.indexOf(`<p>Number of infants:2</p>`) > 0, true);

                                    assert.equal(latestEmail.message.indexOf(`LIST_MISCELLANEOUS_PURCHASES`), -1);
                                    assert.equal(latestEmail.message.indexOf(`<p>Additional purchases:Sports Drinks (70), Water (6)</p>`) > 0 ||
                                        latestEmail.message.indexOf(`<p>Additional purchases:Water (6), Sports Drinks (70)</p>`) > 0, true);

                                    assert.equal(latestEmail.message.indexOf(`LIST_EQUIPMENT`), -1);
                                    assert.equal(latestEmail.message.indexOf(`<p><em>Equipment:</em> Baby seats (1), Trail alongs (2), Small kids bikes (3), Large kids bikes (4)</p>`) > 0, true);

                                    assert.equal(latestEmail.message.indexOf(`NETT_SALE_AMOUNT`), -1);
                                    assert.equal(latestEmail.message.indexOf(`<p><strong>Nett sale amount:</strong> $412.50</p>`) > 0, true);

                                    assert.equal(latestEmail.message.indexOf(`NUMBER_OF_FAMILIES`), -1);
                                    assert.equal(latestEmail.message.indexOf(`ADDITIONAL_RIDERS`), -1);

                                    dummyData.noOfBabies = '0';
                                    dummyData.babySeats = '1';
                                    dummyData.trailAlongs = '0';
                                    dummyData.smallKidsBikes = '0';
                                    dummyData.largeKidsBikes = '4';
                                    request({
                                        method: 'PUT',
                                        url: `${config.host}purchases/tours/${toruDetailId}`,
                                        json: true,
                                        form: dummyData,
                                        headers: { Cookie: authCookie }
                                    }, (error, response) => {
                                        assert.equal(response.statusCode, 200);

                                        setTimeout(() => {
                                            request({
                                                method: 'GET',
                                                url: `${config.host}broadcasts?from=${moment().format(`YYYY-MM-DD`)}&to=${moment().format(`YYYY-MM-DD`)}&emailTo=shumsan1011@gmail.com`,
                                                json: true,
                                                headers: { Cookie: authCookie }
                                            }, (error, response) => {
                                                assert.equal(response.statusCode, 200);

                                                let latestEmail = response.body.data[0];
                                                response.body.data.map(item => {
                                                    if (moment(item.sentDate).isAfter(latestEmail.sentDate)) {
                                                        latestEmail = item;
                                                    }
                                                });

                                                assert.equal(latestEmail.message.indexOf(`<p>Total Number of Guests: 2</p>`) > -1, true);

                                                assert.equal(latestEmail.message.indexOf(`NUMBER_OF_INFANTS`), -1);
                                                assert.equal(latestEmail.message.indexOf(`Number of infants`), -1);
                
                                                assert.equal(latestEmail.message.indexOf(`LIST_MISCELLANEOUS_PURCHASES`), -1);
                                                assert.equal(latestEmail.message.indexOf(`<p>Additional purchases:Sports Drinks (70), Water (6)</p>`) > 0 ||
                                                    latestEmail.message.indexOf(`<p>Additional purchases:Water (6), Sports Drinks (70)</p>`) > 0, true);

                                                assert.equal(latestEmail.message.indexOf(`LIST_EQUIPMENT`), -1);
                                                assert.equal(latestEmail.message.indexOf(`<p><em>Equipment:</em> Baby seats (1), Large kids bikes (4)</p>`) > 0, true);
                
                                                assert.equal(latestEmail.message.indexOf(`NETT_SALE_AMOUNT`), -1);
                                                assert.equal(latestEmail.message.indexOf(`<p><strong>Nett sale amount:</strong> $412.50</p>`) > 0, true);
                                                
                                                assert.equal(latestEmail.message.indexOf(`NUMBER_OF_FAMILIES`), -1);
                                                assert.equal(latestEmail.message.indexOf(`ADDITIONAL_RIDERS`), -1);

                                                dummyData.family = '1';
                                                dummyData.noOfAdults = '0';
                                                dummyData.noOfChildren = '0';
                                                dummyData.noOfFamilyGroups = '1';
                                                dummyData.noOfAdditionals = '3';
                                                dummyData.babySeats = '1';
                                                dummyData.trailAlongs = '0';
                                                dummyData.smallKidsBikes = '0';
                                                dummyData.largeKidsBikes = '4';
                                                request({
                                                    method: 'PUT',
                                                    url: `${config.host}purchases/tours/${toruDetailId}`,
                                                    json: true,
                                                    form: dummyData,
                                                    headers: { Cookie: authCookie }
                                                }, (error, response) => {
                                                    assert.equal(response.statusCode, 200);
            
                                                    setTimeout(() => {
                                                        request({
                                                            method: 'GET',
                                                            url: `${config.host}broadcasts?from=${moment().format(`YYYY-MM-DD`)}&to=${moment().format(`YYYY-MM-DD`)}&emailTo=shumsan1011@gmail.com`,
                                                            json: true,
                                                            headers: { Cookie: authCookie }
                                                        }, (error, response) => {
                                                            assert.equal(response.statusCode, 200);

                                                            let latestEmail = response.body.data[0];
                                                            response.body.data.map(item => {
                                                                if (moment(item.sentDate).isAfter(latestEmail.sentDate)) {
                                                                    latestEmail = item;
                                                                }
                                                            });

                                                            assert.equal(latestEmail.message.indexOf(`<p>Total Number of Guests: 7</p>`) > -1, true);

                                                            assert.equal(latestEmail.message.indexOf(`NUMBER_OF_INFANTS`), -1);
                                                            assert.equal(latestEmail.message.indexOf(`Number of infants`), -1);

                                                            assert.equal(latestEmail.message.indexOf(`NUMBER_OF_FAMILIES`), -1);
                                                            assert.equal(latestEmail.message.indexOf(`<p>Number of families:   1  </p>`) > 0, true);

                                                            assert.equal(latestEmail.message.indexOf(`ADDITIONAL_RIDERS`), -1);
                                                            assert.equal(latestEmail.message.indexOf(`<p>Additional riders:3</p>`) > 0, true);

                                                            done();
                                                        });
                                                    }, 2000);
                                                });
                                            });
                                        }, 2000);
                                    });
                                });
                            }, 2000);
                        });
                    });
                });
            });
        });
    }).timeout(60000);
});