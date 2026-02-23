require('dotenv').config();
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testUpload() {
    try {
        const dummyImagePath = path.join(__dirname, 'dummy_test.jpg');
        const base64Data = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
        fs.writeFileSync(dummyImagePath, Buffer.from(base64Data, 'base64'));

        console.log('Dummy image created at', dummyImagePath);
        console.log('Sending Offer Popup Create request...');

        const popupForm = new FormData();
        popupForm.append('heading', 'Test Popup ' + Date.now());
        popupForm.append('description', 'test description ' + Date.now());
        popupForm.append('image', fs.createReadStream(dummyImagePath));

        const popupRes = await axios.post('http://localhost:5000/api/offer-popups', popupForm, {
            headers: { ...popupForm.getHeaders() },
            timeout: 10000 // 10 second timeout
        });

        console.log('Popup Create Response Status:', popupRes.status);
        console.log('Popup Create Response Data:', popupRes.data);

        fs.unlinkSync(dummyImagePath);
        process.exit(0);
    } catch (err) {
        console.error('Test Failed:', err.response ? err.response.data : err.message);
        process.exit(1);
    }
}

testUpload();
