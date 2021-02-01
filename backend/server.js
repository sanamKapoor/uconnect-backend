const fs = require('fs');
const express = require('express');
const cors = require('cors')({origin: true});
const passport = require('passport');

require('dotenv').config();
const HttpError = require('./middleware/error');

const app = express();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => console.log(`Server is running on port : ${PORT}`))

//  DB Connect
const db = require('./config/db');
db(server);

app.use(cors());
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use('/backend/uploads', express.static('./backend/uploads'))
app.use(passport.initialize());

require('./config/passport-jwt');
require('./config/passport-google');

// Routes
app.use('/auth', require('./routes/authRoute'));

app.use(passport.authenticate('jwt', { session: false }));

app.use('/user', require('./routes/userRoute'));
app.use('/post', require('./routes/postRoute'));

app.use((req, res, next) => {
    const error = new HttpError('Could not connect to the server!', 404);
    next(error);
})

app.use((error, req, res, next) => {
    if(req.file){
        fs.unlink(req.file.path, err => {
            console.log(err)
        })
    }
    if(res.headerSent){
        return next(error)
    }
    res.status(error.code || 500).json({ message: error.message || 'Server Error!' })
})
