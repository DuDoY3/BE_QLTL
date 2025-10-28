const express = require('express');
const app = express();

app.use(express.json());

app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

app.listen(8001, () => {
    console.log('Test server running on port 8001');
});




