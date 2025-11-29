const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("🔄 Attempting to connect to MongoDB...");
    console.log("📍 MONGODB_URI:", process.env.MONGODB_URI ? "Set" : "Not set");

    const connOptions = {};
    if (process.env.DB_NAME) {
      connOptions.dbName = process.env.DB_NAME;
      console.log("📂 Database name:", process.env.DB_NAME);
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, connOptions);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    if (process.env.DB_NAME) {
      console.log(`📂 Database: ${process.env.DB_NAME}`);
    }

    // Test the connection
    await mongoose.connection.db.admin().ping();
    console.log("🏥 MongoDB ping successful");

  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("Full error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
