const mongoose = require('mongoose');

const heroSectionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subtitle: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    ctaText: {
        type: String,
        default: 'Shop Now'
    },
    ctaLink: {
        type: String,
        default: '/products'
    },
    gradient: {
        type: String,
        default: 'from-black/90 via-black/40 to-transparent'
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

module.exports = mongoose.model('HeroSection', heroSectionSchema);
