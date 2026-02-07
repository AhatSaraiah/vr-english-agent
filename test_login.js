const axios = require('axios');

async function testLogin() {
    console.log('--- Testing /api/login ---');
    try {
        const res = await axios.post('http://localhost:3000/api/login', {
            email: 'teacher@school.com',
            password: 'password123'
        });
        console.log('Login Success:', res.status);
        console.log('User:', res.data.user);
    } catch (e) {
        console.error('Login Failed:', e.response ? e.response.status : e.message);
        if (e.response) console.error(e.response.data);
    }
}

testLogin();
