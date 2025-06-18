const express = require('express');
const { check } = require('express-validator');
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  resetPin
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  [
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('phone', 'Please include a valid 11-digit phone number').isLength({ min: 11, max: 11 }),
    check('bvn', 'Please include a valid 11-digit BVN').isLength({ min: 11, max: 11 }),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('pin', 'PIN must be 4 digits').isLength({ min: 4, max: 4 })
  ],
  register
);

router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  login
);

router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword', resetPassword);
router.put('/resetpin', protect, resetPin);

module.exports = router;