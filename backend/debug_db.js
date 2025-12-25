const mongoose = require("mongoose");
const Product = require("./models/Product");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = async () => {
    try {
        console.log("Connecting to:", process.env.MONGODB_URI ? "URI SET" : "URI MISSING");
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const checkProducts = async () => {
    await connectDB();
    try {
        const products = await Product.find({}, 'name status published product_structure');
        console.log("Total Products:", products.length);
        console.log("--- Products ---");
        products.forEach(p => {
            console.log(`ID: ${p._id}, Name: ${p.name}, Status: ${p.status}, Published: ${p.published}, Structure: ${p.product_structure}`);
        });
        console.log("----------------");

        const archived = await Product.find({ status: 'archived' });
        console.log("Archived Products Count (Query {status: 'archived'}):", archived.length);

        const archivedPublishedFalse = await Product.find({ status: 'archived', published: false });
        console.log("Archived & Published:false Count:", archivedPublishedFalse.length);

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
};

checkProducts();
