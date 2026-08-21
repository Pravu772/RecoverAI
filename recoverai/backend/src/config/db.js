const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URI from environment variables.
 * Exits the process on failure so the app doesn't start in a broken state.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Fail fast on bad URI
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    console.error('   Check your MONGO_URI in .env — is MongoDB running?');
    process.exit(1);
  }
};

module.exports = connectDB;
