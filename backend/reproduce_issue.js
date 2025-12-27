const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_URL = 'http://localhost:5000/api';
const PRODUCT_ID = '693fe095ba15ed3c0a9e61c5'; // BackPacks

const updateProduct = async (categories) => {
    try {
        const form = new FormData();
        // Add minimal required fields to avoid validation errors if any
        form.append('name', 'BackPacks');
        form.append('sku', 'BP-001');

        if (categories !== null) {
            form.append('categories', JSON.stringify(categories));
        }

        console.log(`Sending update with categories: ${JSON.stringify(categories)}`);

        const res = await axios.put(`${API_URL}/products/${PRODUCT_ID}`, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log('Update Status:', res.status);
        console.log('Update Response:', res.data.success);

        // Check verification
        const checkRes = await axios.get(`${API_URL}/products/${PRODUCT_ID}`);
        console.log('Current Categories in DB:', JSON.stringify(checkRes.data.data.categories, null, 2));

    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
};

const run = async () => {
    console.log('--- TEST 1: Clear Categories ---');
    await updateProduct([]); // Send empty array

    console.log('\n--- TEST 2: Set Category Back ---');
    // Using the ID we found earlier: 6934013b1b924363f9ff4071
    await updateProduct([{ category: '6934013b1b924363f9ff4071' }]);
};

run();
