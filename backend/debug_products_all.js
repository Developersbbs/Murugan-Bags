const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ims-test');
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
};

const debugAllProducts = async () => {
    await connectDB();

    try {
        console.log('--- Dumping First 5 Products ---');
        const products = await Product.find({}).limit(5);

        products.forEach(p => {
            console.log('------------------------------------------------');
            console.log('Name:', p.name);
            console.log('Type:', p.product_type);
            console.log('Structure:', p.product_structure);
            console.log('Color Field:', p.color);
            console.log('Variants Count:', p.product_variants ? p.product_variants.length : 0);
            if (p.product_variants && p.product_variants.length > 0) {
                console.log('First Variant:', JSON.stringify(p.product_variants[0], null, 2));
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

debugAllProducts();
