require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function test() {
  const token = jwt.sign({ id: 1, email: 'admin@admin.com', role: 'ADMIN' }, process.env.JWT_SECRET || 'carmelita-secret-key-2024');
  
  try {
    const res = await axios.post('http://localhost:3001/api/warehouses/zones', {
      floorId: 1,
      name: "1ER PISO-ZONA C",
      code: "A1.P1.C"
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("API returned:", res.data);
  } catch(e) {
    console.error("API error status:", e.response?.status);
    console.error("API error data:", e.response?.data);
  }
}
test();
