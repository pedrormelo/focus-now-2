// Simple test script for the Focus Now API
const http = require('http');

const testAPI = () => {
    console.log('Testing Focus Now API...');
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/health',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Response:', data);
            if (res.statusCode === 200) {
                console.log('✅ API is working!');
            } else {
                console.log('❌ API error');
            }
        });
    });

    req.on('error', (error) => {
        console.log('❌ Cannot connect to API:', error.message);
        console.log('Make sure the backend server is running on port 3000');
    });

    req.end();
};

testAPI();