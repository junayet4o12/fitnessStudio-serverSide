// frontend/src/api.js
const axios = require('axios');;

const clientId = '23RMXW'
const clientSecret = 'c761a7e0676e522c105a94ab105c9f27'
const axiosSecure = axios.create({
  baseURL: 'https://api.fitbit.com/oauth2', 
  timeout: 5000,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
},
});

module.exports = axiosSecure;
