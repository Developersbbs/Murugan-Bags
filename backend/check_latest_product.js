const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function checkLatestProduct() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const product = await Product.findOne().sort({ created_at: -1 });

        if (product) {
            console.log('=== LATEST PRODUCT ===');
            console.log('ID:', product._id);
            console.log('Name:', product.name);
            console.log('Structure:', product.product_structure);
            console.log('Image URLs (Main):', product.image_url);
            console.log('Is Array?', Array.isArray(product.image_url));
            console.log('Length:', product.image_url ? product.image_url.length : 0);

            if (product.product_variants && product.product_variants.length > 0) {
                console.log('=== VARIANTS ===');
                product.product_variants.forEach((v, i) => {
                    console.log(`Variant ${i}:`, v.images);
                });
            }
        } else {
            console.log('No products found');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkLatestProduct();
