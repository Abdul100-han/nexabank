const express = require('express');
const { check } = require('express-validator');
const {
  transfer,
  getReceipt
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/transfer',
  [
    protect,
    [
      check('amount', 'Amount is required and must be a number').isNumeric(),
      check('recipientAccount', 'Recipient account number is required').not().isEmpty(),
      check('recipientBank', 'Recipient bank is required').not().isEmpty(),
      check('pin', 'PIN is required and must be 4 digits').isLength({ min: 4, max: 4 })
    ]
  ],
  transfer
);

router.get('/:id/receipt', protect, getReceipt);

module.exports = router;