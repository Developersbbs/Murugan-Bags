const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Razorpay = require('razorpay');

const LOG_FILE = path.join(__dirname, 'razorpay-test.log');

function log(msg) {
    fs.appendFileSync(LOG_FILE, msg + '\n');
    console.log(msg);
}

async function testRazorpay() {
    log('Testing Razorpay Connection...');
    log('Key ID: ' + process.env.RAZORPAY_KEY_ID);

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        log('❌ Keys missing in environment');
        return;
    }

    try {
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: 100, // 100 paise = 1 INR
            currency: "INR",
            receipt: "test_receipt_" + Date.now(),
            payment_capture: 1,
        };

        log('Attempting to create order with options: ' + JSON.stringify(options));

        // Add timeout
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout after 10s')), 10000)
        );

        const orderPromise = razorpay.orders.create(options);

        const order = await Promise.race([orderPromise, timeoutPromise]);
        log('✅ Order created successfully: ' + JSON.stringify(order));
    } catch (error) {
        log('❌ Failed to create order: ' + error.message);
        if (error.error) {
            log('Error Details: ' + JSON.stringify(error.error, null, 2));
        }
    }
}

try {
    testRazorpay();
} catch (e) {
    log('CRITICAL ERROR: ' + e.message);
}
