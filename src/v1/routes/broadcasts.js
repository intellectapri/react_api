/**
 * Broadcasts routes
 */

const express = require('express');
const router = express.Router();

const utils = require('../shared/utils');

const broadcasts = require('./../models/broadcasts');
const broadcastsSend = require('./../models/broadcasts.send');
const broadcastAttachments = require('./../models/broadcastAttachments');

router.use(utils.protectedRouteCheck);

router.get(`/broadcasts`, (req, res) => {
    broadcasts.search(req.query).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/broadcasts`, (req, res) => {
    broadcasts.create(req.body, req.session.userId).then(results => {
        res.send(results);
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.put(`/broadcasts/:emailId`, (req, res) => {
    broadcasts.update(req.params.emailId, req.body, req.session.userId).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.delete(`/broadcasts/:emailId`, (req, res) => {
    broadcasts.delete(req.params.emailId, req.session.userId).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/broadcasts/:emailId/send`, (req, res) => {
    broadcastsSend.broadcast_send(req.params.emailId, req.session.userId).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.post(`/broadcasts/:emailId/attachment`, (req, res) => {
    broadcastAttachments.add(req.params.emailId, req.body).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

router.delete(`/broadcasts/attachments/:attachmentId`, (req, res) => {
    broadcastAttachments.delete(req.params.attachmentId).then(() => {
        res.send({ status: 'success' });
    }).catch(error => {
        utils.handleError(res, error);
    });
});

module.exports = router;

