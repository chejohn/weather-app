const axios = require('axios');

exports.handler = async function(event) {
  const { location } = event.queryStringParameters;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${location}&key=${process.env.LOCATION_KEY}`;
  try {
    const { data } = await axios.get(url);
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    const { status, statusText, headers, data } = error.response;
    return {
      statusCode: status,
      body: JSON.stringify({ status, statusText, headers, data }),
    };
  }
};
