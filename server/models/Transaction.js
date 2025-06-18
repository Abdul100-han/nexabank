const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['transfer', 'deposit', 'withdrawal', 'airtime', 'bill'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  fee: {
    type: Number,
    default: 0
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  description: String,
  recipient: {
    accountNumber: String,
    accountName: String,
    bankName: String
  },
  billDetails: {
    type: {
      type: String,
      enum: ['airtime', 'electricity', 'cable', 'data', 'other']
    },
    provider: String,
    phone: String,
    meterNumber: String,
    plan: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate reference number before saving
TransactionSchema.pre('save', function(next) {
  if (!this.reference) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.reference = `NEXA-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Transaction', TransactionSchema);