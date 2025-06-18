const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { TRANSACTION_FEE } = require('../config/config');
const { nigerianBanks } = require('../utils/bankList');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// @desc    Transfer money to another bank
// @route   POST /api/transactions/transfer
// @access  Private
exports.transfer = async (req, res, next) => {
  try {
    const { amount, recipientAccount, recipientBank, pin, description } = req.body;

    // Find sender
    const sender = await User.findById(req.user.id).select('+pin');

    // Verify PIN
    const isPinValid = await sender.matchPin(pin);
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

    // Check balance
    const amountInKobo = amount * 100;
    const totalDebit = amountInKobo + TRANSACTION_FEE;

    if (sender.balance < totalDebit) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Find recipient bank in our list
    const recipientBankInfo = nigerianBanks.find(bank => bank.code === recipientBank);
    if (!recipientBankInfo) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipient bank'
      });
    }

    // In a real app, you would verify the account number with the bank's API
    // For this demo, we'll just use a mock account name
    const recipientAccountName = `Recipient ${Math.floor(Math.random() * 1000)}`;

    // Create transaction
    const transaction = await Transaction.create({
      user: sender._id,
      type: 'transfer',
      amount: amountInKobo,
      fee: TRANSACTION_FEE,
      status: 'completed',
      description: description || `Transfer to ${recipientAccountName}`,
      recipient: {
        accountNumber: recipientAccount,
        accountName: recipientAccountName,
        bankName: recipientBankInfo.name
      }
    });

    // Update sender balance
    sender.balance -= totalDebit;
    sender.transactions.push(transaction._id);
    await sender.save();

    // Generate receipt
    const receipt = await generateReceipt(transaction, sender);

    res.status(200).json({
      success: true,
      data: {
        transaction: {
          ...transaction._doc,
          amount: transaction.amount / 100,
          fee: transaction.fee / 100
        },
        receipt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get transaction receipt
// @route   GET /api/transactions/:id/receipt
// @access  Private
exports.getReceipt = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const user = await User.findById(req.user.id);
    const receipt = await generateReceipt(transaction, user);

    res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to generate PDF receipt
async function generateReceipt(transaction, user) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData.toString('base64'));
      });

      // Add receipt content
      doc.fontSize(20).text('NexaBank', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text('Transaction Receipt', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).text(`Reference: ${transaction.reference}`);
      doc.text(`Date: ${transaction.createdAt.toLocaleString()}`);
      doc.text(`Type: ${transaction.type.toUpperCase()}`);
      doc.moveDown();
      
      doc.text(`From: ${user.accounts[0].accountName}`);
      doc.text(`Account: ${user.accounts[0].accountNumber}`);
      doc.text(`Bank: ${user.accounts[0].bankName}`);
      doc.moveDown();
      
      if (transaction.recipient) {
        doc.text(`To: ${transaction.recipient.accountName}`);
        doc.text(`Account: ${transaction.recipient.accountNumber}`);
        doc.text(`Bank: ${transaction.recipient.bankName}`);
        doc.moveDown();
      }
      
      doc.text(`Amount: ₦${(transaction.amount / 100).toLocaleString()}`);
      doc.text(`Fee: ₦${(transaction.fee / 100).toLocaleString()}`);
      doc.moveDown();
      
      doc.text(`Description: ${transaction.description || 'N/A'}`);
      doc.moveDown();
      
      doc.fontSize(10).text('Thank you for banking with us!', { align: 'center' });
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}