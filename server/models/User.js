const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [
      /^[0-9]{11}$/,
      'Please add a valid 11-digit Nigerian phone number'
    ]
  },
  bvn: {
    type: String,
    required: [true, 'BVN is required'],
    unique: true,
    match: [
      /^[0-9]{11}$/,
      'Please add a valid 11-digit BVN'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  pin: {
    type: String,
    required: [true, '4-digit PIN is required'],
    match: [
      /^[0-9]{4}$/,
      'PIN must be 4 digits'
    ],
    select: false
  },
  balance: {
    type: Number,
    default: config.INITIAL_BALANCE * 100 // Stored in kobo (1 Naira = 100 kobo)
  },
  accounts: [
    {
      accountNumber: {
        type: String,
        unique: true
      },
      accountName: String,
      bankName: String
    }
  ],
  transactions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    }
  ],
  otp: String,
  otpExpire: Date,
  lastActivity: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Encrypt PIN using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Match user entered PIN to hashed PIN in database
UserSchema.methods.matchPin = async function(enteredPin) {
  return await bcrypt.compare(enteredPin, this.pin);
};

// Generate account number (10 digits)
UserSchema.pre('save', function(next) {
  if (this.isNew && !this.accounts.length) {
    const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    this.accounts.push({
      accountNumber,
      accountName: `${this.firstName} ${this.lastName}`,
      bankName: 'NexaBank'
    });
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);