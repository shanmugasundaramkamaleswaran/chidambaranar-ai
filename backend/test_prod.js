const axios = require('axios');

async function testProductionBackend() {
    const url = 'https://abimanyuai-1.onrender.com/chat';
    console.log(`Testing production backend: ${url}`);
    try {
        const response = await axios.post(url, {
            message: "Hello Abimanyu"
        });
        console.log('--- SUCCESS ---');
        console.log(response.data);
    } catch (e) {
        console.error('--- PRODUCTION ERROR ---');
        if (e.response) {
            console.error(e.response.status, e.response.data);
        } else {
            console.error(e.message);
        }
    }
}

testProductionBackend();
