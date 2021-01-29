const mongoose = require('mongoose');
require('dotenv').config();

module.exports = async (server) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useCreateIndex: true,
            useNewUrlParser: true,
            useUnifiedTopology: true
        })

        const io = require('../socket').init(server);
        io.on('connection', socket => {
            // console.log('Client connected.');
        })
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}
