/**
 * Testing Email class
 */

const assert = require('assert');
const moment = require('moment');
const uuid = require('uuid/v1');
const Imap = require('imap');

const Email = require('../../src/v1/models/Email');

var db = require('../../src/v1/shared/db');

describe('Email class', function () {
    this.timeout(20000);

    it('should send emails', (done) => {
        db.init();

        // @todo Attachments

        let subject = `Test subject ${uuid()}`;

        let instance = new Email(`HIGHLIGHTS-CONF`);
        instance.setSubject(subject);
        instance.setFrom(process.env.SMTP_FROM);
        instance.setTexttype(`customer`);
        instance.addTo(process.env.IMAP_FROM, `John Smith`);

        instance.addVariable('{TOUR_DATE}', moment(`2019-10-14`).format(`dddd, d-M-Y`));
        instance.addVariable('{TOUR_TIME}', `5:00 pm`);
        instance.addVariable('{TOUR_TYPE}', `Test product`);
        instance.addVariable('{TOUR_LANGUAGE}', `English`);
        instance.addVariable('{LEAD_TRAVELLER_LAST_NAME}', `Smith`);
        instance.addVariable('{NUMBER_OF_ADULTS}', 4);
        instance.addVariable('{NUMBER_OF_CHILDREN}', 2);
        instance.addVariable('{TOTAL_GUESTS}', 6);
        instance.addVariable('{BOOKING_ID}', 101010);
        instance.addVariable('{AMOUNT_PAID}', 123.20);
        instance.addVariable('{AMOUNT_OUTSTANDING}', 34.30);
        instance.addVariable('{GUEST_NOTES}', `Guest note`);
        instance.addVariable('{BOOKING_REF_ID}', `123 Booking Ref Identifier`);
        instance.addVariable('{BOOKING_STATUS}', `Active`);
        instance.addVariable('{VOUCHER_PURCHASER_LAST_NAME}', `Voucher last name`);

        instance.send().then(() => {
            console.log(`Email was sent`);

            setTimeout(() => {
                let imap = new Imap({
                    user: process.env.IMAP_USER,
                    password: process.env.IMAP_PASSWORD,
                    host: process.env.IMAP_HOST,
                    port: process.env.IMAP_PORT,
                    tls: true,
                    authTimeout: 15000
                });

                function openInbox(cb) {
                    imap.openBox(`INBOX`, true, cb);
                }

                imap.once(`ready`, function() {
                    openInbox(function(err, box) {
                        if (err) throw err;

                        var f = imap.seq.fetch(box.messages.total + ':*', {
                            bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
                            struct: true
                        });

                        f.on(`message`, function(msg, seqno) {
                            msg.on(`body`, function(stream, info) {
                                var buffer = '';
                                stream.on('data', function(chunk) {
                                    buffer += chunk.toString('utf8');
                                });

                                stream.once('end', function() {
                                    let tmp = JSON.stringify(Imap.parseHeader(buffer));
                                    if (tmp.indexOf(subject) > -1) {
                                        assert.equal(tmp.indexOf(subject) > -1, true);
                                        imap.end();
                                        db.end(done);
                                    }
                                });
                            });
                        });

                        f.once(`error`, function(err) {
                            console.log(`Fetch error: ` + err);
                        });

                        f.once(`end`, function() {
                            imap.end();
                        });
                    });
                });

                imap.once(`error`, console.log);
                imap.once(`end`, console.log);
                imap.connect();
            }, 10000);
        }).catch(error => {
            console.log(error);
        });
    });
});