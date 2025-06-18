const express = require('express');
const { check } = require('express-validator');
const {
  getBillOptions,
  buyAirtime,
  payBill
} = require('../controllers/billController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/options', protect, getBillOptions);

router.post(
  '/airtime',
  [
    protect,
    [
      check('network', 'Network is required').not().isEmpty(),
      check('phone', 'Phone number is required and must be 11 digits').isLength({ min: 11, max: 11 }),
      check('amount', 'Amount is required and must be a number').isNumeric(),
      check('pin', 'PIN is required and must be 4 digits').isLength({ min: 4, max: 4 })
    ]
  ],
  buyAirtime
);

router.post(
  '/pay',
  [
    protect,
    [
      check('billType', 'Bill type is required').not().isEmpty(),
      check('provider', 'Provider is required').not().isEmpty(),
      check('amount', 'Amount is required and must be a number').isNumeric(),
      check('accountNumber', 'Account/Meter number is required').not().isEmpty(),
      check('pin', 'PIN is required and must be 4 digits').isLength({ min: 4, max: 4 })
    ]
  ],
  payBill
);

module.exports = router;