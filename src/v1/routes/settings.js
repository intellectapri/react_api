/**
 * Settings routes
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');

const db = require('./../shared/db');
const utils = require('./../shared/utils');

router.use(utils.protectedRouteCheck);

const SETTINGS = [`ADVBOOKING_ACC`, `DEFAULT_EMAIL`, `ONLINE_BOOKING_CONFIRM_EMAIL`, `ORDER_CONFIRMATION_MESSAGE`];

router.get(`/settings`, (req, res) => {
    db.get().execute(`SELECT * FROM st_setting ORDER BY settingID`, (err, results) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        res.send(JSON.stringify(results));
    });
});

router.put(`/settings`, (req, res) => {
    if (`settings` in req.body && Array.isArray(req.body.settings) && req.body.settings.length === 4) {
        let updateClauses = [];
        let validSettingsWereProvided = true;
        req.body.settings.map(item => {
            if (SETTINGS.indexOf(item.key) > -1) {
                updateClauses.push(`UPDATE st_setting SET settingValue = '${utils.sanitize(item.value)}' WHERE settingID = '${item.key}'`);
            } else {
                validSettingsWereProvided = false;
            }
        });

        if (validSettingsWereProvided) {
            let promises = [];
            updateClauses.map(clause => {
                promises.push(new Promise((resolve, reject) => {
                    db.get().execute(clause, (err, results) => {
                        if (err) {
                            reject();
                        } else {
                            resolve();
                        }
                    });
                }));
            });

            Promise.all(promises).then(() => {
                res.send({ status: 'success' });
            }).catch(() => {
                res.status(500).send(`Failed to update application settings`);
            });
        } else {
            res.status(400).send(`Invalid application settings keys were provided, allowed are ${SETTINGS.join(`, `)}`);
        }
    } else {
        res.status(400).send(`Invalid application settings were provided`);
    }
});


module.exports = router;