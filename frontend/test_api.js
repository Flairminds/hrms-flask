const axios = require('axios');
axios.post('http://127.0.0.1:5000/api/HRFunctionality/login', { employee_id: 'E001', password: 'password' })
  .then(res => {
    // We don't know a valid login. Let's just mock it or skip it.
  }).catch(e => console.log(e.message));
