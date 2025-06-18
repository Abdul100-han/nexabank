const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @desc    Get account balance
// @route   GET /api/accounts/balance
// @access  Private
exports.getBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('balance accounts');

    res.status(200).json({
      success: true,
      data: {
        balance: user.balance / 100, // Convert from kobo to Naira
        accounts: user.accounts
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get transaction history
// @route   GET /api/accounts/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort('-createdAt')
      .limit(50);

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions.map(tx => ({
        ...tx._doc,
        amount: tx.amount / 100, // Convert from kobo to Naira
        fee: tx.fee / 100
      }))
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/accounts/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    }).select('-password -pin -otp -otpExpire');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};