/**
 * Authorization routes
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');

const db = require('./../shared/db');
const utils = require('./../shared/utils');

router.get(`/`, (req, res) => {
    res.send({ status: 'success' });
});

/**
 * Sign in
 */
router.post(`/auth`, (req, res) => {

    if (req.session.loggedIn) {
        res.send('User is already logged in');
    } else {
        // @todo The login is searched in "email" field which is not actually an email, just a string - fix the database
        const schema = Joi.object().keys({
            login: Joi.string().required(),
            password: Joi.string().required()
        });

        if (!req.body.login || utils.sanitize(req.body.login) === `inactive`) {
            utils.handleError(res, utils.errors.NOT_AUTHORIZED);
        } else {
            let hashedPassword = utils.hashPassword(req.body.password, process.env.SECRET);
            Joi.validate(req.body, schema).then(() => {
                let sql = `SELECT userID as userId, email, city, address, suburb, state, postcode, country, accessLevel, firstname, lastname FROM user
                    WHERE email = '${utils.sanitize(req.body.login)}'
                    AND (password = '${utils.sanitize(req.body.password)}' OR password = '${hashedPassword.substr(0, 25)}')`;
                db.get().execute(sql, (error, results) => {

                    if (error) {
                        utils.handleError(res, error);
                    } else {
                        if (results.length === 1) {
                            db.get().execute(`SELECT groupCode, user_group.groupID, userID FROM user_group
                                LEFT JOIN ${process.env.DB_NAME}.groups ON user_group.groupID = ${process.env.DB_NAME}.groups.groupID
                                WHERE user_group.userID = ${results[0].userId}`, (error, userGroupResults) => {
                                if (error) {
                                    utils.handleError(res, error);
                                } else {
                                    let data = results[0];
                                    if (userGroupResults.length === 1) {
                                        data.groupCode = userGroupResults[0].groupCode;
                                    } else if (userGroupResults.length === 0) {
                                        data.groupCode = `MANAGER`;
                                    } else {
                                        userGroupResults.map(item => {
                                            if (item.groupCode === `ADMIN`) {
                                                data.groupCode = `ADMIN`;
                                            } else if (item.groupCode === `MANAGER`) {
                                                data.groupCode = `MANAGER`;
                                            }
                                        });
                                    }

                                    req.session.loggedIn = true;
                                    req.session.user = data;
                                    res.send(data);
                                }
                            });
                        } else {
                            utils.handleError(res, utils.errors.NOT_AUTHORIZED);
                        }
                    }
                });
            }).catch(error => {
                utils.handleError(res, error);
            });
        }
    }
});

/**
 * Check if user is signed in
 */
router.get(`/auth`, (req, res) => {
    if (req.session.loggedIn && req.session.user) {
        res.send(req.session.user);
    } else {
        try {
            req.session.destroy((err) => {
                if (err) {
                    utils.handleError(res, error);
                } else {
                    res.clearCookie('connect.sid', { path: '/' }).status(401).send({
                        status: 'failure',
                        message: `User is not signed in`
                    });
                }
            });
        } catch (err) {
            res.clearCookie('connect.sid', { path: '/' }).status(401).send({
                status: 'failure',
                message: `User is not signed in`
            });
        }
    }
});


/**
 * Destroy session
 */
router.delete(`/auth`, (req, res) => {
    if (req.session.loggedIn) {
        req.session.destroy((error) => {
            if (error) {
                utils.handleError(res, error);
            } else {
                res.clearCookie('connect.sid', { path: '/' }).send({
                    status: 'success',
                    message: `User was signed out`
                });
            }
        });
    } else {
        res.clearCookie('connect.sid', { path: '/' }).send({
            status: 'success',
            message: `User has not been signed in before`
        });
    }
});

module.exports = router;
