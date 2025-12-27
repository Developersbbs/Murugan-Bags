const mongoose = require('mongoose');
const Product = require('./models/Product');
const Category = require('./models/Category');
require('dotenv').config();

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ims-test';
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();
    try {
        // Find products with "Trolley" in the name
        const products = await Product.find({ name: { $regex: 'Trolley', $options: 'i' } })
            .populate('categories.category')
            .lean();

        console.log(`Found ${products.length} products matching "Trolley"`);

        products.forEach(p => {
            console.log('--- Product ---');
            console.log('ID:', p._id);
            console.log('Name:', p.name);
            console.log('Categories (Raw):', JSON.stringify(p.categories, null, 2));
            if (p.categories && p.categories.length > 0) {
                p.categories.forEach((c, i) => {
                    console.log(`Category [${i}]:`, c.category ? c.category.name : 'NULL CATEGORY REF');
                });
            } else {
                console.log('Categories array is empty');
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

run();
