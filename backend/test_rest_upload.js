const axios = require('axios');

async function testRestUpload() {
    const bucket = 'murugan-bags.firebasestorage.app';
    const filename = 'test/api_upload_' + Date.now() + '.txt';
    // Note: the REST API requires URL encoded object names
    const nameEncoded = encodeURIComponent(filename);

    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${nameEncoded}`;

    try {
        const response = await axios.post(uploadUrl, 'Hello from REST API!', {
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        console.log('Upload successful:', response.data);
    } catch (err) {
        console.error('Upload failed:');
        if (err.response) {
            console.error(err.response.status, err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

testRestUpload();
