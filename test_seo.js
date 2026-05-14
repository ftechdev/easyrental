require("dotenv").config();
const axios = require("axios");

const BASE_URL = "http://localhost:5000/api/seo"; // Assuming server is on 5000

async function testSeo() {
  try {
    // 1. Get all SEO (should be empty initially or have some)
    console.log("Fetching all SEO...");
    // Note: This needs admin auth, so I'll skip it in this script or use the public get
    
    // 2. Test public get for /about
    console.log("Fetching SEO for /about...");
    const getRes = await axios.get(`${BASE_URL}/get?path=/about`);
    console.log("Result:", getRes.data);

  } catch (error) {
    console.error("Test failed:", error.response ? error.response.data : error.message);
  }
}

testSeo();
