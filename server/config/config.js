module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRE: '24h',
  INITIAL_BALANCE: 200000, // Initial balance for new users in kobo (200,000 Naira)
  TRANSACTION_FEE: 50, // 50 kobo (0.5 Naira) per transaction
  OTP_EXPIRE_MINUTES: 5,
  INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
};