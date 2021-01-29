const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    googleId: {
        type: String
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String
    },
    password: {
        type: String
    },
    image: {
        type: String
    },
    imgId: {
        type: String
    },
    profession: String,
    bio: String,
    location: String,
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post'
        }
    ],
    connections: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ]
})

module.exports = mongoose.model('User', userSchema);