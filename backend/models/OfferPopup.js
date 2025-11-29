const mongoose = require('mongoose');

const offerPopupSchema = new mongoose.Schema({
    image: {
        type: String,
        required: true,
        trim: true
    },
    heading: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    buttonText: {
        type: String,
        default: 'Shop Now',
        trim: true
    },
    buttonLink: {
        type: String,
        default: '/products',
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    priority: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        default: null
    },
    endDate: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient querying
offerPopupSchema.index({ isActive: 1, priority: -1 });

// Method to check if popup is currently valid based on date range
offerPopupSchema.methods.isCurrentlyValid = function () {
    const now = new Date();

    // If no date restrictions, it's valid
    if (!this.startDate && !this.endDate) {
        return true;
    }

    // Check if current date is within the valid range
    const afterStart = !this.startDate || now >= this.startDate;
    const beforeEnd = !this.endDate || now <= this.endDate;

    return afterStart && beforeEnd;
};

module.exports = mongoose.model('OfferPopup', offerPopupSchema);
