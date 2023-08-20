
var fs = require('fs');
var assert = require('assert');
var request = require('request');
var moment = require('moment');
var config = require('./../config');
var utils = require('./testUtils');

let dummyData = JSON.parse(fs.readFileSync(__dirname + '/data/tourPurchase.json'));

let authCookie = false,
tourPurchaseId = false, tourDetailId = false, anotherTourPurchaseId = false, anotherTourDetailId = false;

describe('Charges module', function () {
    beforeEach(done => {
        utils.authorize().then(cookie => {
            authCookie = cookie;
            request({
                method: 'POST',
                url: `${config.host}purchases/tours`,
                json: true,
                form: dummyData,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.confirmationSent, 3);
                tourPurchaseId = response.body.purchaseId;
                tourDetailId = response.body.detailId;

                request({
                    method: 'POST',
                    url: `${config.host}purchases/tours`,
                    json: true,
                    form: dummyData,
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    assert.equal(response.body.confirmationSent, 3);
                    anotherTourPurchaseId = response.body.purchaseId;
                    anotherTourDetailId = response.body.detailId;

                    done();
                });
            });
        });
    });
 
    it('should add charge and refund for the tour purchase, list history, update added status, lock the purchase for editing and delete charge', done => {
        let chargeId, refundId;
        request({
            method: 'GET',
            url: `${config.host}purchases/tours/${tourPurchaseId}`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.locked, false);
            request({
                method: 'POST',
                url: `${config.host}purchases/${tourPurchaseId}/payment`,
                json: true,
                form: {
                    paymentDate: '2019-01-02',
                    amount: 120,
                    method: 'invoice',
                    internalNotes: 'some notes'
                },
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                chargeId = response.body.id;

                request({
                    method: 'POST',
                    url: `${config.host}purchases/${tourPurchaseId}/refund`,
                    json: true,
                    form: {
                        paymentDate: '2019-01-02',
                        amount: 120,
                        method: 'invoice',
                        refundReason: 'some refund notes',
                        internalNotes: 'some notes'
                    },
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    refundId = response.body.id;

                    request({
                        method: 'GET',
                        url: `${config.host}purchases/${tourPurchaseId}/history`,
                        json: true,
                        headers: { Cookie: authCookie }
                    }, (error, response) => {
                        assert.equal(response.statusCode, 200);
                        assert.equal(response.body.history[1].chargeID, chargeId);
                        assert.equal(response.body.history[1].addedToAccounting, 0);
                        assert.equal(response.body.history[2].chargeID, refundId);
                        assert.equal(response.body.history[2].addedToAccounting, 0);

                        request({
                            method: 'PUT',
                            url: `${config.host}purchases/charges/${chargeId}`,
                            json: true,
                            headers: { Cookie: authCookie },
                            form: {
                                addedToAccounting: true
                            }
                        }, (error, response) => {
                            assert.equal(response.statusCode, 200);

                            request({
                                method: 'GET',
                                url: `${config.host}purchases/${tourPurchaseId}/history`,
                                json: true,
                                headers: { Cookie: authCookie }
                            }, (error, response) => {
                                assert.equal(response.statusCode, 200);
                                assert.equal(response.body.history[1].chargeID, chargeId);
                                assert.equal(response.body.history[1].addedToAccounting, 1);
                                assert.equal(response.body.history[2].chargeID, refundId);
                                assert.equal(response.body.history[2].addedToAccounting, 0);

                                request({
                                    method: 'GET',
                                    url: `${config.host}purchases/tours/${tourPurchaseId}`,
                                    json: true,
                                    headers: { Cookie: authCookie }
                                }, (error, response) => {
                                    assert.equal(response.statusCode, 200);
                                    assert.equal(response.body.locked, true);

                                    request({
                                        method: 'DELETE',
                                        url: `${config.host}purchases/charges/${chargeId}`,
                                        json: true,
                                        headers: { Cookie: authCookie }
                                    }, (error, response) => {
                                        assert.equal(response.statusCode, 200);
                                        request({
                                            method: 'GET',
                                            url: `${config.host}purchases/${tourPurchaseId}/history`,
                                            json: true,
                                            headers: { Cookie: authCookie }
                                        }, (error, response) => {
                                            assert.equal(response.statusCode, 200);
                                            assert.equal(response.body.history.length, 2);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    it('should set the booking status to Refunded when complete refund is made', done => {
        request({
            method: 'POST',
            url: `${config.host}purchases/${anotherTourPurchaseId}/payment`,
            json: true,
            form: {
                paymentDate: '2019-01-02',
                amount: 10,
                method: 'cash',
                internalNotes: ''
            },
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            request({
                method: 'POST',
                url: `${config.host}purchases/${anotherTourPurchaseId}/payment`,
                json: true,
                form: {
                    paymentDate: '2019-01-02',
                    amount: 20,
                    method: 'cash',
                    internalNotes: ''
                },
                headers: { Cookie: authCookie }
            }, (error, response) => {
                request({
                    method: 'GET',
                    url: `${config.host}purchases/${anotherTourPurchaseId}/history`,
                    json: true,
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    request({
                        method: 'DELETE',
                        url: `${config.host}purchases/charges/${response.body.history[0].chargeID}`,
                        json: true,
                        headers: { Cookie: authCookie }
                    }, (error, response) => {
                        assert.equal(response.statusCode, 200);
                        request({
                            method: 'GET',
                            url: `${config.host}purchases/tours/${anotherTourPurchaseId}`,
                            json: true,
                            headers: { Cookie: authCookie }
                        }, (error, response) => {
                            assert.equal(response.statusCode, 200);
                            assert.equal(response.body.status, 'active');
                            request({
                                method: 'POST',
                                url: `${config.host}purchases/${anotherTourPurchaseId}/refund`,
                                json: true,
                                form: {
                                    paymentDate: '2019-01-02',
                                    amount: 30,
                                    method: 'cash',
                                    refundReason: 'test',
                                    internalNotes: ''
                                },
                                headers: { Cookie: authCookie }
                            }, (error, response) => {
                                request({
                                    method: 'GET',
                                    url: `${config.host}purchases/tours/${anotherTourPurchaseId}`,
                                    json: true,
                                    headers: { Cookie: authCookie }
                                }, (error, response) => {
                                    assert.equal(response.statusCode, 200);
                                    assert.equal(response.body.status, 'refunded');
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    it('should regenerate invoice upon booking update if amount is more than 0, should only delete all invoices if suum is 0', done => {

        let localDummyData = JSON.parse(JSON.stringify(dummyData));
        request({
            method: 'POST',
            url: `${config.host}purchases/tours`,
            json: true,
            form: localDummyData,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.confirmationSent, 3);

            let purchaseId = response.body.purchaseId;
            let detailId = response.body.detailId;

            request({
                method: 'GET',
                url: `${config.host}purchases/${purchaseId}/history`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.history[0].method, 'invoice');
                assert.equal(response.body.history[0].amount, '193.50');

                localDummyData.purchaseId = purchaseId;
                localDummyData.detailId = detailId;
                localDummyData.totalGross = 400;
                localDummyData.commission = 100;
                localDummyData.commissionLevel = 25;
                localDummyData.totalNet = 300;
                request({
                    method: 'PUT',
                    url: `${config.host}purchases/tours/${detailId}`,
                    json: true,
                    form: localDummyData,
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);

                    request({
                        method: 'GET',
                        url: `${config.host}purchases/${purchaseId}/history`,
                        json: true,
                        headers: { Cookie: authCookie }
                    }, (error, response) => {
                        assert.equal(response.statusCode, 200);
                        assert.equal(response.body.history[0].method, 'invoice');
                        assert.equal(response.body.history[0].amount, '300.00');

                        localDummyData.purchaseId = purchaseId;
                        localDummyData.detailId = detailId;
                        localDummyData.totalGross = 0;
                        localDummyData.commission = 0;
                        localDummyData.commissionLevel = 25;
                        localDummyData.totalNet = 0;
                        request({
                            method: 'PUT',
                            url: `${config.host}purchases/tours/${detailId}`,
                            json: true,
                            form: localDummyData,
                            headers: { Cookie: authCookie }
                        }, (error, response) => {
                            assert.equal(response.statusCode, 200);

                            request({
                                method: 'GET',
                                url: `${config.host}purchases/${purchaseId}/history`,
                                json: true,
                                headers: { Cookie: authCookie }
                            }, (error, response) => {
                                assert.equal(response.statusCode, 200);
                                assert.equal(response.body.history.length, 0);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it('should add multiple payments for purchase, mark one payment as added to accounting, list history, update purchase and perform auto-adjusting of non-added to accounting payments', done => {
        let firstChargeId = false;
        request({
            method: 'GET',
            url: `${config.host}purchases/tours/${tourPurchaseId}`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);

            // Create invoice payment
            request({
                method: 'POST',
                url: `${config.host}purchases/${tourPurchaseId}/payment`,
                json: true,
                form: {
                    paymentDate: '2019-01-02',
                    amount: 10,
                    method: 'invoice',
                    internalNotes: ''
                },
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                firstChargeId = response.body.id;

                // Create invoice payment
                request({
                    method: 'POST',
                    url: `${config.host}purchases/${tourPurchaseId}/payment`,
                    json: true,
                    form: {
                        paymentDate: '2019-01-02',
                        amount: 20,
                        method: 'invoice',
                        internalNotes: ''
                    },
                    headers: { Cookie: authCookie }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);

                    // Add to accounting first payment
                    request({
                        method: 'PUT',
                        url: `${config.host}purchases/charges/${firstChargeId}`,
                        json: true,
                        headers: { Cookie: authCookie },
                        form: {
                            addedToAccounting: true
                        }
                    }, (error, response) => {
                        assert.equal(response.statusCode, 200);

                        request({
                            method: 'GET',
                            url: `${config.host}purchases/${tourPurchaseId}/history`,
                            json: true,
                            headers: { Cookie: authCookie }
                        }, (error, response) => {
                            assert.equal(response.statusCode, 200);
                            assert.equal(response.body.history.length, 3);

                            let initialNonAddedInvoiceAmount = 0;
                            response.body.history.map(item => {
                                if (item.method === `invoice` && !item.addedToAccounting) {
                                    initialNonAddedInvoiceAmount += parseFloat(item.amount);
                                }
                            });

                            assert.equal(initialNonAddedInvoiceAmount, 213.5);

                            let localDummyData = Object.assign({}, dummyData);
                            localDummyData.purchaseId = tourPurchaseId;
                            localDummyData.detailId = tourDetailId;
                            localDummyData.totalNet = `315.63`;

                            request({
                                method: 'PUT',
                                url: `${config.host}purchases/tours/${tourDetailId}`,
                                json: true,
                                form: localDummyData,
                                headers: { Cookie: authCookie }
                            }, (error, response) => {
                                assert.equal(response.statusCode, 200);

                                request({
                                    method: 'GET',
                                    url: `${config.host}purchases/${tourPurchaseId}/history`,
                                    json: true,
                                    headers: { Cookie: authCookie }
                                }, (error, response) => {
                                    assert.equal(response.statusCode, 200);
                                    assert.equal(response.body.history.length, 3);

                                    assert.equal(response.body.history[0].amount, `193.50`);
                                    assert.equal(response.body.history[1].amount, `10.00`);
                                    assert.equal(response.body.history[2].amount, `20.00`);

                                    done();
                                });                               
                            });
                        });
                    });
                });
            });
        });
    });

    it('should remove all invoices (having non-added to accounting invoices only) when only-invoices payments booking is cancelled', done => {
        let localDummyData = Object.assign({}, dummyData);
        localDummyData.purchaseId = tourPurchaseId;
        localDummyData.detailId = tourDetailId;
        localDummyData.status = `cancelled`;

        request({
            method: 'PUT',
            url: `${config.host}purchases/tours/${tourDetailId}`,
            json: true,
            form: localDummyData,
            headers: { Cookie: authCookie }
        }, (error, response) => {
            assert.equal(response.statusCode, 200);

            request({
                method: 'GET',
                url: `${config.host}purchases/${tourPurchaseId}/history`,
                json: true,
                headers: { Cookie: authCookie }
            }, (error, response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.history.length, 0);
                done();
            });
        });
    });

    it('should remember who and when created and updated the Added to accounting property', done => {
        request({
            method: 'GET',
            url: `${config.host}purchases/${tourPurchaseId}/history`,
            json: true,
            headers: { Cookie: authCookie }
        }, (error, oldResponse) => {
            assert.equal(oldResponse.statusCode, 200);
            assert.equal(oldResponse.body.history[0].addedStaff, 196);
            assert.equal(oldResponse.body.history[0].addedTime.length > 4, true);
            assert.equal(oldResponse.body.history[0].addedToAccountingUpdatedBy, null);
            assert.equal(oldResponse.body.history[0].addedToAccountingUpdatedAt, null);

            let addedChargeId = oldResponse.body.history[0].chargeID;

            setTimeout(() => {
                request({
                    method: 'PUT',
                    url: `${config.host}purchases/charges/${addedChargeId}`,
                    json: true,
                    headers: { Cookie: authCookie },
                    form: {
                        addedToAccounting: true
                    }
                }, (error, response) => {
                    assert.equal(response.statusCode, 200);
                    request({
                        method: 'GET',
                        url: `${config.host}purchases/${tourPurchaseId}/history`,
                        json: true,
                        headers: { Cookie: authCookie }
                    }, (error, newResponse) => {
                        assert.equal(newResponse.statusCode, 200);
                        assert.equal(newResponse.body.history[0].addedStaff, 196);
                        assert.equal(newResponse.body.history[0].addedTime.length > 4, true);
                        assert.equal(newResponse.body.history[0].addedToAccountingUpdatedBy, 196);
                        assert.equal(newResponse.body.history[0].addedToAccountingUpdatedAt.length > 4, true);

                        assert.equal(moment(oldResponse.body.history[0].addedTime).isBefore(newResponse.body.history[0].addedToAccountingUpdatedAt), true);

                        done();
                    });
                });
            }, 2000);
        });
    });
});