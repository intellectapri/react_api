/**
 * Users routes
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');

const utils = require('./../shared/utils');
const db = require('./../shared/db');

router.use(utils.protectedRouteCheck);

let createScheme = Joi.object().keys({
    firstname: Joi.string().required(),
    lastname: Joi.string().required(),
    password: Joi.string().required(),
    accessLevel: Joi.number().integer(),
    accountEnabled: Joi.number().integer().required(),
    groupID: Joi.number().integer(),
    email: Joi.string().required(),
});

let updateScheme = createScheme.concat(Joi.object().keys({
    password: Joi.string().optional()
}));

const INACTIVE_EMAIL = `inactive`;

router.get(`/users`, (req, res) => {
    db.get().execute(`SELECT user.userID, firstname, lastname, email, accountEnabled, groups.groupID as groupID
        FROM user
        LEFT OUTER JOIN user_group
        ON user.userID = user_group.userID
        LEFT OUTER JOIN ${process.env.DB_NAME}.groups
        ON user_group.groupID = ${process.env.DB_NAME}.groups.groupID
        ORDER BY firstname`, (error, results) => {
        if (error) {
            utils.handleError(res, error);
        } else {
            let cleanedResults = [];
            results.map(item => {
                cleanedResults.push({
                    userId: item.userID,
                    lastname: item.lastname,
                    firstname: item.firstname,
                    email: (item.email === INACTIVE_EMAIL ? `` : item.email),
                    groupID: item.groupID,
                    accountEnabled: (item.accountEnabled && item.email !== INACTIVE_EMAIL ? true : false)
                });
            });

            res.send(cleanedResults);
        }
    });
});

router.get(`/users/groups`, (req, res) => {
    db.get().execute('SELECT * FROM groups', (error, results) => {
        if (error) {
            utils.handleError(res, error);
        } else {
            let cleanedResults = [];
            results.map(item => {
                cleanedResults.push({
                    groupId: item.groupID,
                    groupName: item.groupName,
                    groupCode: item.groupCode,
                });
            });

            res.send(cleanedResults);
        }
    });
});

router.get(`/users/:id`, (req, res) => {
    let sql = `SELECT user.userID, firstname, lastname, email, accountEnabled, groups.groupID as groupID
        FROM user
        LEFT OUTER JOIN user_group
        ON user.userID = user_group.userID
        LEFT OUTER JOIN groups
        ON user_group.groupID = groups.groupID
        WHERE user.userID = ${utils.sanitize(req.params.id)}`;
    db.get().execute(sql, (error, results) => {
        if (error) {
            utils.handleError(res, error);
        } else if (results.length === 1) {
            let userCopy = results[0];
            userCopy.userId = userCopy.userID;
            delete userCopy.userID;

            res.send(userCopy);
        } else {
            utils.handleError(res, utils.errors.NOT_FOUND);
        }
    });
});

const getValueStatements = (data) => {
    statements = [];
    [`firstname`, `lastname`, `password`, `email`, `accountEnabled`].map(property => {
        if (data[property]) statements.push( `${property} = '${utils.sanitize(data[property])}' `);
    });

    return statements;
};

router.post(`/users`, (req, res) => {
    Joi.validate(req.body, createScheme).then(() => {
        if (process.env.SECRET && process.env.SECRET.length > 16) {
            let hashedPassword = utils.hashPassword(req.body.password, process.env.SECRET);

            req.body.password = hashedPassword;
            let statements = getValueStatements(req.body);
            statements.push(` lastPasswordChange = NOW() `);

            db.get().execute(`INSERT INTO user SET ${statements.join(` , `)};`, (error, result) => {
                if (error) {
                    utils.handleError(res, error);
                } else if (result.insertId) {
                    db.get().execute(`INSERT INTO user_group VALUES (${req.body.groupID}, ${result.insertId})`, (error) => {
                        if (error) {
                            utils.handleError(res, error);
                        } else {
                            res.send({ id: result.insertId });
                        }
                    });
                } else {
                    utils.handleError(res, `Error occured while saving new user`);
                }
            });
        } else {
            utils.handleError(res, `Password management is not so secure as it should be`);
        }
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/users/:id`, (req, res) => {
    Joi.validate(req.body, updateScheme).then(() => {
        let statements = getValueStatements(req.body);
        if (statements.length > 0) {
            db.get().execute(`UPDATE user SET ${statements.join(`, `)}
                WHERE userID = ${req.params.id}`, (error, result) => {
                if (error) {
                    utils.handleError(res, error);
                } else if (result.affectedRows === 1) {
                    db.get().execute(`DELETE FROM user_group WHERE userID = ${req.params.id}`, (error, result) => {
                        if (error) {
                            utils.handleError(res, error);
                        } else {
                            db.get().execute(`INSERT INTO user_group VALUES (${req.body.groupID}, ${req.params.id})`, (error, result) => {
                                if (error) {
                                    utils.handleError(res, error);
                                } else {
                                    res.send({ status: 'success' });
                                }
                            });
                        }
                    });
                } else {
                    utils.handleError(res, `Error occured while updating user`);
                }
            });
        } else {
            res.status(400).send(`Nothing to update`);
        }
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.delete(`/users/:id`, (req, res) => {
    db.get().execute(`UPDATE user SET accountEnabled = 0
        WHERE userID = ${parseInt(req.params.id)}`, (error, result) => {
        if (error) {
            utils.handleError(res, error);
        } else if (result.affectedRows === 1) {
            res.send({ status: 'success' });
        } else {
            utils.handleError(res, `Error occured while deleting user`);
        }
    });
});

module.exports = router;
