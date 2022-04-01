const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

require('dotenv').config();
const User = require('../model/User');
const HttpError = require('../middleware/error');

const opt = {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
}

const callBack = async (accessToken, refreshToken, profile, cb) => {
    const newUser = {
        googleId: profile.id,
        email: profile.email,
        username: profile.displayName,
        image: profile.photos[0].value
    }

    let token;

    try {
        let user = null;
        user = await User.findOne({ email: profile.email })

        if(user){
            throw new HttpError('User already exist with this email', 400)
        }

        user = await User.findOne({ googleId: profile.id })
        if(user){
            token = jwt.sign({ userId: user._id }, process.env.SECRET, { expiresIn: process.env.EXPIRATION_TIME })
            user.token = token;
            cb(null, user)
        } else {
            user = await User.create(newUser)
            token = jwt.sign({ userId: user._id }, process.env.SECRET, { expiresIn: process.env.EXPIRATION_TIME })
            user.token = token;
            cb(null, user)
        }

    } catch(err){
        console.log(err)
    }
  } 

const googleStrategy = new GoogleStrategy(opt, callBack)

passport.use(googleStrategy);

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
});

module.exports = passport;