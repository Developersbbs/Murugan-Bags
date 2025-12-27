const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ims-test';
        console.log('Connecting to:', uri.replace(/:([^:@]+)@/, ':****@'));
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
};

const publishAllProducts = async () => {
    await connectDB();

    try {
        console.log('--- Publishing All Products ---');

        // Update Products
        const result = await Product.updateMany(
            {},
            { $set: { published: true } }
        );
        console.log(`Products Updated: ${result.modifiedCount}`);

        // Update Variants
        const products = await Product.find({ product_structure: 'variant' });
        for (const p of products) {
            console.log(`Processing ${p.name}, current published: ${p.published}`);
            p.published = true; // Ensure it's true
            if (p.product_variants) {
                p.product_variants.forEach(v => v.published = true);
            }
            await p.save();
            console.log(`Saved ${p.name} with published: true`);
        }

        console.log('All products published successfully.');

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

publishAllProducts();
