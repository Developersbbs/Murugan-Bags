require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const admin = require('./lib/firebase');

const Product = require('./models/Product');
const Category = require('./models/Category');
const Subcategory = require('./models/Subcategory');
const Staff = require('./models/Staff');
const HeroSection = require('./models/HeroSection');
const OfferPopup = require('./models/OfferPopup');
const NewArrivalBanner = require('./models/NewArrivalBanner');

// Map of Collections and their image fields to process
const collectionsConfig = [
    {
        model: Category,
        fields: ['image_url']
    },
    {
        model: Subcategory,
        fields: ['image_url']
    },
    {
        model: Staff,
        fields: ['image_url']
    },
    {
        model: HeroSection,
        fields: ['image'] // HeroSection uses 'image' not 'image_url' natively (though sometimes both)
    },
    {
        model: OfferPopup,
        fields: ['imageUrl'] // OfferPopup uses 'imageUrl'
    },
    {
        model: NewArrivalBanner,
        fields: ['imageUrl'] // NewArrivalBanner uses 'imageUrl'
    }
];

// Helper to check if string is local path
const isLocalPath = (str) => typeof str === 'string' && str.startsWith('/uploads/');

async function uploadToFirebase(localRelativePath) {
    if (!localRelativePath) return null;

    // Construct absolute local path
    const absolutePath = path.join(__dirname, localRelativePath);
    if (!fs.existsSync(absolutePath)) {
        console.warn(`File not found locally: ${absolutePath}`);
        return null; // Return null if file is missing locally
    }

    try {
        const bucket = admin.storage().bucket();
        // Remove leading slash to make Firebase structure match cleanly, e.g. "uploads/products/image.jpg"
        const firebasePath = localRelativePath.startsWith('/') ? localRelativePath.substring(1) : localRelativePath;

        const [file] = await bucket.upload(absolutePath, {
            destination: firebasePath,
            public: true, // Make publicly readable
            metadata: {
                cacheControl: 'public, max-age=31536000'
            }
        });

        // Generate public URL format
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${firebasePath}`;
        return publicUrl;
    } catch (err) {
        console.error(`Firebase upload failed for ${localRelativePath}:`, err);
        return null;
    }
}

async function migrateImages() {
    console.log("Starting Image Migration to Firebase...");
    console.log("Connecting to MongoDB format:", process.env.MONGODB_URI ? "URI found" : "URI MISSING");
    
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB successfully.");
    } catch (e) {
        console.error("MongoDB Connection Failed:", e);
        process.exit(1);
    }

    try {
        const bucket = admin.storage().bucket();
        console.log("Firebase Storage Bucket initialized:", bucket.name);
    } catch (e) {
        console.error("Firebase Auth Failed:", e);
        process.exit(1);
    }

    let totalMigrated = 0;
    let totalFailed = 0;

    // 1. Process standard schemas
    for (const config of collectionsConfig) {
        console.log(`\\n--- Processing ${config.model.modelName} ---`);
        const docs = await config.model.find({});
        for (const doc of docs) {
            let docUpdated = false;

            for (const field of config.fields) {
                const currentVal = doc[field];
                if (isLocalPath(currentVal)) {
                    console.log(`Migrating ${config.model.modelName}[${doc._id}] - ${field}: ${currentVal}`);
                    const newUrl = await uploadToFirebase(currentVal);
                    if (newUrl) {
                        doc[field] = newUrl;
                        docUpdated = true;
                        totalMigrated++;
                    } else {
                        totalFailed++;
                    }
                }
            }

            // HeroSection sometimes uses 'image', sometimes 'imageUrl' depending on routes logic context mapping, cover both
            if (config.model === HeroSection && doc.imageUrl && isLocalPath(doc.imageUrl)) {
                 console.log(`Migrating ${config.model.modelName}[${doc._id}] - imageUrl: ${doc.imageUrl}`);
                 const newUrl = await uploadToFirebase(doc.imageUrl);
                 if (newUrl) {
                     doc.imageUrl = newUrl;
                     docUpdated = true;
                     totalMigrated++;
                 } else { totalFailed++; }
            }

            if (docUpdated) {
                // Must skip validation in case other strict rules hit
                await config.model.updateOne({ _id: doc._id }, { $set: doc.toObject() });
            }
        }
    }

    // 2. Process Products separately (complex arrays and variants structure)
    console.log(`\\n--- Processing Products ---`);
    const products = await Product.find({});
    for (const product of products) {
        let productUpdated = false;

        // Process Main Image URL array
        if (product.image_url && Array.isArray(product.image_url)) {
            const newImageUrls = [];
            for (const img of product.image_url) {
                if (isLocalPath(img)) {
                    console.log(`Migrating Product[${product._id}] main image: ${img}`);
                    const newUrl = await uploadToFirebase(img);
                    if (newUrl) {
                        newImageUrls.push(newUrl);
                        productUpdated = true;
                        totalMigrated++;
                    } else {
                        newImageUrls.push(img); // Keep original if fail
                        totalFailed++;
                    }
                } else {
                    newImageUrls.push(img);
                }
            }
            if (productUpdated) product.image_url = newImageUrls;
        }

        // Process Variant Images arrays
        if (product.product_variants && Array.isArray(product.product_variants)) {
            for (let i = 0; i < product.product_variants.length; i++) {
                const variant = product.product_variants[i];
                if (variant.images && Array.isArray(variant.images)) {
                    const newVariantImageUrls = [];
                    let variantUpdated = false;

                    for (const img of variant.images) {
                        if (isLocalPath(img)) {
                            console.log(`Migrating Product[${product._id}] Variant[${variant.sku || i}] image: ${img}`);
                            const newUrl = await uploadToFirebase(img);
                            if (newUrl) {
                                newVariantImageUrls.push(newUrl);
                                variantUpdated = true;
                                productUpdated = true;
                                totalMigrated++;
                            } else {
                                newVariantImageUrls.push(img);
                                totalFailed++;
                            }
                        } else {
                            newVariantImageUrls.push(img);
                        }
                    }

                    if (variantUpdated) {
                        product.product_variants[i].images = newVariantImageUrls;
                    }
                }
            }
        }

        if (productUpdated) {
             await Product.updateOne({ _id: product._id }, { $set: product.toObject() });
        }
    }

    console.log(`\\n=== MIGRATION COMPLETE ===`);
    console.log(`Total Successfully Migrated: ${totalMigrated}`);
    console.log(`Total Failed (Missing Local File or DB Error): ${totalFailed}`);
    
    mongoose.connection.close();
    process.exit(0);
}

migrateImages().catch(err => {
    console.error("Migration fatal error:", err);
    process.exit(1);
});
