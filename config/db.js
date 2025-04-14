const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://mongodb:27017/gold_price_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10, // Add connection pool
            minPoolSize: 5,   // Minimum connections in pool
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            serverSelectionTimeoutMS: 5000, // Timeout for server selection
        });

        // Add connection event listeners
        mongoose.connection.on('error', err => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected, attempting to reconnect...');
        });

        console.log('MongoDB Connected with connection pooling');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;