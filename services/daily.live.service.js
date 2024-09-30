const axios = require("axios");

const getLiveResult = async () => {
  const url = `${process.env.API_URL}/live`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch live result");
  }
};

module.exports = { getLiveResult };
