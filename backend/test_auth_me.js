const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_here_change_this_to_random_string";

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ims-test';
        console.log('Testing DB connection...');
        const start = Date.now();
        await mongoose.connect(uri);
        console.log(`DB Connected in ${(Date.now() - start)}ms`);
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
};

const run = async () => {
    await connectDB();

    // 1. Get a user
    const Staff = require('./models/Staff');
    const user = await Staff.findOne();

    if (!user) {
        console.log('No staff user found to test with.');
        mongoose.disconnect();
        return;
    }

    console.log(`Found user: ${user.name} (${user._id})`);

    // 2. Generate Token
    const token = jwt.sign(
        {
            id: user._id.toString(),
            email: user.email,
            role: user.role_id || 'staff',
            type: 'staff'
        },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    console.log('Generated Token');

    // 3. Hit /me endpoint
    try {
        console.log('Sending request to /auth/me...');
        const start = Date.now();
        const res = await axios.get(`${API_URL}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            timeout: 5000 // 5s timeout
        });
        console.log(`Response received in ${(Date.now() - start)}ms`);
        console.log('Status:', res.status);
        console.log('Data:', res.data);
    } catch (err) {
        console.error('Request failed:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', err.response.data);
        }
    } finally {
        mongoose.disconnect();
    }
};

run();
