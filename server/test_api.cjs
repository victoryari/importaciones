require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function test() {
  const token = jwt.sign({ id: 1, email: 'admin@admin.com', role: 'ADMIN' }, process.env.JWT_SECRET || 'carmelita-secret-key-2024');
  
  try {
    const res = await axios.get('http://localhost:3001/api/warehouses', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("API returned:", JSON.stringify(res.data, null, 2));
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
