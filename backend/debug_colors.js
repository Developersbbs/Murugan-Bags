const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ims-test';
        console.log('Connecting to:', uri.replace(/:([^:@]+)@/, ':****@')); // Mask password
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
};

const debugColors = async () => {
    await connectDB();

    try {
        console.log('--- Checking Product Level Colors ---');
        const distinctColors = await Product.distinct('color');
        console.log('Distinct colors (raw):', distinctColors);

        console.log('\n--- Checking Variant Level Attributes ---');
        const variantProducts = await Product.find({
            product_structure: 'variant',
            'product_variants.0': { $exists: true }
        }).limit(5).select('name product_variants published');

        variantProducts.forEach(p => {
            console.log(`Product: ${p.name} (${p._id}) - Published: ${p.published}`);
            p.product_variants.forEach((v, idx) => {
                if (idx < 3) { // Show first 3 variants
                    console.log(`  Variant ${idx}: Published: ${v.published}`);
                    console.log(`    Attributes:`, v.attributes);
                    // Check if map or object
                    console.log(`    Is Map? ${v.attributes instanceof Map}`);
                    console.log(`    Type: ${typeof v.attributes}`);
                }
            });
        });

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

debugColors();
