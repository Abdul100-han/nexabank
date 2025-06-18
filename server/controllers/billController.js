const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { TRANSACTION_FEE } = require('../config/config');

// Nigerian telcos
const telcos = [
  { id: 'mtn', name: 'MTN' },
  { id: 'airtel', name: 'Airtel' },
  { id: 'glo', name: 'Glo' },
  { id: '9mobile', name: '9mobile' }
];

// Bill types
const billTypes = [
  { id: 'airtime', name: 'Airtime' },
  { id: 'data', name: 'Data' },
  { id: 'electricity', name: 'Electricity' },
  { id: 'cable', name: 'Cable TV' }
];

// Electricity providers
const electricityProviders = [
  { id: 'ikedc', name: 'IKEDC' },
  { id: 'ekedc', name: 'EKEDC' },
  { id: 'phed', name: 'PHED' },
  { id: 'kedco', name: 'KEDCO' }
];

// Cable providers
const cableProviders = [
  { id: 'dstv', name: 'DSTV' },
  { id: 'gotv', name: 'GOTV' },
  { id: 'startimes', name: 'StarTimes' }
];

// Data plans (simplified)
const dataPlans = [
  { id: 'mtn-1gb', name: 'MTN 1GB', price: 50000, validity: '30 days' },
  { id: 'airtel-1gb', name: 'Airtel 1GB', price: 50000, validity: '30 days' },
  { id: 'glo-1gb', name: 'Glo 1GB', price: 45000, validity: '30 days' },
  { id: '9mobile-1gb', name: '9mobile 1GB', price: 50000, validity: '30 days' }
];

// @desc    Get bill payment options
// @route   GET /api/bills/options
// @access  Private
exports.getBillOptions = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        telcos,
        billTypes,
        electricityProviders,
        cableProviders,
        dataPlans
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Buy airtime
// @route   POST /api/bills/airtime
// @access  Private
exports.buyAirtime = async (req, res, next) => {
  try {
    const { network, phone, amount, pin } = req.body;

    // Find user
    const user = await User.findById(req.user.id).select('+pin');

    // Verify PIN
    const isPinValid = await user.matchPin(pin);
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

    // Check if network is valid
    const telco = telcos.find(t => t.id === network);
    if (!telco) {
      return res.status(400).json({
        success: false,
        message: 'Invalid network provider'
      });
    }

    // Check phone number
    if (!phone || phone.length !== 11) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number'
      });
    }

    // Check amount
    const amountInKobo = amount * 100;
    if (amountInKobo < 5000) { // Minimum of ₦50
      return res.status(400).json({
        success: false,
        message: 'Minimum airtime purchase is ₦50'
      });
    }

    // Check balance
    if (user.balance < amountInKobo) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: user._id,
      type: 'airtime',
      amount: amountInKobo,
      status: 'completed',
      description: `Airtime purchase for ${phone} (${telco.name})`,
      billDetails: {
        type: 'airtime',
        provider: telco.name,
        phone
      }
    });

    // Update user balance
    user.balance -= amountInKobo;
    user.transactions.push(transaction._id);
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        transaction: {
          ...transaction._doc,
          amount: transaction.amount / 100
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Pay bill (electricity, cable, etc.)
// @route   POST /api/bills/pay
// @access  Private
exports.payBill = async (req, res, next) => {
  try {
    const { billType, provider, amount, accountNumber, pin, plan } = req.body;

    // Find user
    const user = await User.findById(req.user.id).select('+pin');

    // Verify PIN
    const isPinValid = await user.matchPin(pin);
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

    // Validate bill type
    const validBillType = billTypes.find(t => t.id === billType);
    if (!validBillType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bill type'
      });
    }

    // Validate provider based on bill type
    let validProvider;
    if (billType === 'electricity') {
      validProvider = electricityProviders.find(p => p.id === provider);
    } else if (billType === 'cable') {
      validProvider = cableProviders.find(p => p.id === provider);
    } else if (billType === 'data') {
      validProvider = telcos.find(p => p.id === provider);
    }

    if (!validProvider) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider for selected bill type'
      });
    }

    // For data plans, validate the selected plan
    let selectedPlan;
    if (billType === 'data') {
      selectedPlan = dataPlans.find(p => p.id === plan);
      if (!selectedPlan) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data plan'
        });
      }
    }

    // Check amount (for non-data bills)
    const amountInKobo = billType === 'data' ? selectedPlan.price : amount * 100;
    if (amountInKobo < 10000) { // Minimum of ₦100 for non-data bills
      return res.status(400).json({
        success: false,
        message: `Minimum payment is ₦${billType === 'data' ? selectedPlan.price / 100 : 100}`
      });
    }

    // Check balance
    if (user.balance < amountInKobo) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: user._id,
      type: 'bill',
      amount: amountInKobo,
      status: 'completed',
      description: billType === 'data' 
        ? `Data purchase: ${selectedPlan.name}`
        : `${validBillType.name} payment to ${validProvider.name}`,
      billDetails: {
        type: billType,
        provider: validProvider.name,
        plan: billType === 'data' ? selectedPlan.name : undefined,
        meterNumber: billType === 'electricity' ? accountNumber : undefined,
        phone: billType === 'data' ? accountNumber : undefined
      }
    });

    // Update user balance
    user.balance -= amountInKobo;
    user.transactions.push(transaction._id);
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        transaction: {
          ...transaction._doc,
          amount: transaction.amount / 100
        }
      }
    });
  } catch (err) {
    next(err);
  }
};