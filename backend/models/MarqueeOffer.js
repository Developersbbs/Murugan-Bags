const mongoose = require('mongoose');

const marqueeOfferSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    icon: {
        type: String,
        default: '🎁' // Default emoji
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
marqueeOfferSchema.index({ order: 1, isActive: 1 });

module.exports = mongoose.model('MarqueeOffer', marqueeOfferSchema);
