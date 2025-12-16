require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Rating = require('./models/Rating');

// Make sure to register models if they haven't been registered by imports above
// (Usually require('./models/...') does registers them)

const productId = '693fe095ba15ed3c0a9e61c5'; // BackPacks ID

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        console.log(`Checking ratings for product ${productId}...`);

        // Check raw count - letting Mongoose auto-cast string ID
        const count = await Rating.countDocuments({ product_id: productId, status: 'approved' });
        console.log(`Found ${count} approved ratings via countDocuments (auto-cast)`);

        // Check raw count with Explicit ObjectId
        const countExplicit = await Rating.countDocuments({
            product_id: new mongoose.Types.ObjectId(productId),
            status: 'approved'
        });
        console.log(`Found ${countExplicit} approved ratings via countDocuments (Explicit ObjectId)`);


        // Run aggregation
        console.log('Running aggregation pipeline...');
        const stats = await Rating.aggregate([
            {
                $match: {
                    product_id: new mongoose.Types.ObjectId(productId),
                    status: 'approved'
                }
            },
            {
                $group: {
                    _id: "$product_id",
                    averageRating: { $avg: "$rating" },
                    totalRatings: { $sum: 1 },
                    totalReviews: {
                        $sum: {
                            $cond: [{ $ifNull: ["$review", false] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        console.log('Aggregation result:', JSON.stringify(stats, null, 2));

        if (stats.length > 0) {
            console.log('Updating Product...');
            const res = await Product.findByIdAndUpdate(productId, {
                averageRating: Math.round(stats[0].averageRating * 10) / 10,
                totalRatings: stats[0].totalRatings,
                totalReviews: stats[0].totalReviews
            }, { new: true });
            console.log('Product updated:', res.averageRating, res.totalRatings, res.totalReviews);
        } else {
            console.log('No stats found, not updating product.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();
