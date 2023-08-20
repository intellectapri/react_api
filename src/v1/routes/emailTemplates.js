/**
 * Email templates routes
 */

const express = require('express');
const router = express.Router();
const utils = require('./../shared/utils');

const emailTemplates = require('./../models/emailTemplates');

router.use(utils.protectedRouteCheck);

router.get(`/emailTemplates`, (req, res) => {
    emailTemplates.list(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/emailTemplates/:id`, (req, res) => {
    emailTemplates.findByTemplateIdentifier(req.params.id).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/emailTemplates`, (req, res) => {
    emailTemplates.create(req.body).then((result) => {
        res.send(result);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/emailTemplates/:id`, (req, res) => {
    emailTemplates.update(req.params.id, req.body).then(() => {
        res.send({ status: 'success'});
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.delete(`/emailTemplates/:id`, (req, res) => {
    emailTemplates.deleteTemplate(req.params.id).then(() => {
        res.send({ status: 'success'});
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.get(`/emailTemplates/:id/preview`, (req, res) => {
    emailTemplates.preview(req.params.id).then(rawTemplate => {
        res.send(rawTemplate);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

module.exports = router;