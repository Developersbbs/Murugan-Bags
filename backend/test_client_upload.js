const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytesResumable, getDownloadURL } = require('firebase/storage');
require('dotenv').config();

const firebaseConfig = {
    apiKey: "AIzaSyCJexHhgYNkQMoVMpFnAzuAWqhhQ09sLDc",
    authDomain: "murugan-bags.firebaseapp.com",
    projectId: "murugan-bags",
    storageBucket: "murugan-bags.firebasestorage.app",
    messagingSenderId: "763190159570",
    appId: "1:763190159570:web:3a780f3a523de8c00d250b"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function testUpload() {
    try {
        const filename = `test_upload_${Date.now()}.txt`;
        console.log('Uploading file:', filename);
        const storageRef = ref(storage, 'test/' + filename);
        const mockData = Buffer.from('Hello, world! This is a test upload from the backend using Firebase Client SDK.');

        // For Node.js, we can pass a Uint8Array or Buffer directly.
        const snapshot = await uploadBytesResumable(storageRef, mockData, { contentType: 'text/plain' });
        console.log('Uploaded a blob or file!');

        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('File available at', downloadURL);
    } catch (error) {
        console.error('Upload failed:', error);
    }
}

testUpload();
