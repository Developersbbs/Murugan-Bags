const mongoose = require('mongoose');

const specialOfferSchema = new mongoose.Schema({
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
        default: 'FaGift' // Default icon name or URL
    },
    bgColor: {
        type: String,
        default: 'from-rose-50 to-rose-100' // Tailwind gradient classes
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
specialOfferSchema.index({ order: 1, isActive: 1 });

module.exports = mongoose.model('SpecialOffer', specialOfferSchema);
