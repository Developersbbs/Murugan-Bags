const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function reproduce() {
    const url = 'http://localhost:5000/api/new-arrival-banners';

    // Find any existing image to use as a test
    const testImagePath = path.join(__dirname, 'uploads/new-arrivals/1768905458329.webp');

    if (!fs.existsSync(testImagePath) || fs.statSync(testImagePath).size < 1024) {
        console.error('Test image not found or too small, creating a 6MB test file...');
        fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
        // Create a 6MB buffer
        const buffer = Buffer.alloc(6 * 1024 * 1024, 'a');
        fs.writeFileSync(testImagePath, buffer);
    }

    const form = new FormData();
    form.append('title', 'Reproduction Test ' + new Date().toISOString());
    form.append('subtitle', 'Testing 500 error');
    form.append('description', 'This is a test');
    form.append('ctaText', 'Shop Now');
    form.append('ctaLink', '/new-arrivals');
    form.append('gradient', 'from-black/90 via-black/40 to-transparent');
    form.append('isActive', 'true');
    form.append('image', fs.createReadStream(testImagePath));

    console.log('Sending POST request to:', url);
    try {
        const response = await axios.post(url, form, {
            headers: {
                ...form.getHeaders()
            }
        });
        console.log('POST SUCCESS:', response.data);
    } catch (error) {
        console.error('FAILED with status:', error.response?.status);
        console.error('ERROR DATA:', JSON.stringify(error.response?.data, null, 2));
        if (error.response?.data?.stack) {
            console.error('STACK TRACE:', error.response.data.stack);
        }
    }
}

reproduce();
