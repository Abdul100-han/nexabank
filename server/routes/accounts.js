const express = require('express');
const {
  getBalance,
  getTransactions,
  updateProfile
} = require('../controllers/accountController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/balance', protect, getBalance);
router.get('/transactions', protect, getTransactions);
router.put('/profile', protect, updateProfile);

module.exports = router;