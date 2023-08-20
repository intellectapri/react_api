var express = require('express');
var router = express.Router();

// Getting all available routes together
router.use(require('./auth'));
router.use(require('./allotments'));
router.use(require('./bookingPartners'));
router.use(require('./broadcasts'));
router.use(require('./charges'));
router.use(require('./emailTemplates'));
router.use(require('./products'));
router.use(require('./purchases'));
router.use(require('./reports'));
router.use(require('./settings'));
router.use(require('./upload'));
router.use(require('./users'));
router.use(require('./discounts'));
router.use(require('./vouchers'));

module.exports = router;