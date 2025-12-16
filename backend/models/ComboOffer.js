const mongoose = require('mongoose');

const comboOfferSchema = new mongoose.Schema({
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
    image: {
        type: String,
        required: false,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    originalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    isLimitedTime: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isHomeFeatured: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Virtual field for savings percentage
comboOfferSchema.virtual('savingsPercent').get(function () {
    if (this.originalPrice > 0) {
        return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
    }
    return 0;
});

// Ensure virtuals are included in JSON
comboOfferSchema.set('toJSON', { virtuals: true });
comboOfferSchema.set('toObject', { virtuals: true });

// Index for efficient querying
comboOfferSchema.index({ order: 1, isActive: 1 });

module.exports = mongoose.model('ComboOffer', comboOfferSchema);
