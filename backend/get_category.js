const mongoose = require('mongoose');
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

const getCategory = async () => {
    await connectDB();
    try {
        const cat = await Category.findOne();
        if (cat) {
            console.log('Category ID:', cat._id.toString());
            console.log('Category Name:', cat.name);
        } else {
            console.log('No categories found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

getCategory();
