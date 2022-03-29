const mongoose = require('mongoose');
require('dotenv').config();

module.exports = async (server) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true})

        console.log('DB Connect');
        const io = require('../socket').init(server);
        io.on('connection', socket => {
            // console.log('Client connected.');
        })
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}
