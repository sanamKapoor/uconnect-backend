const { validationResult } = require('express-validator');
const HttpError = require('../middleware/error');
const User = require('../model/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmailUsingNodemailer } = require('../middleware/nodemailer');
require('dotenv').config();

exports.register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            let msg = errors.errors[0].msg;
            const error = new HttpError(msg, 500);
            return next(error)
        }

        const { username, email, password, image, imgId } = req.body;
        if(!username || !email || !password || !image || !imgId){
            const error = new HttpError('Please provide all the fields', 500);
            return next(error)
        }

        const isUser = await User.findOne({ email: email })
        if(isUser){
            const error = new HttpError('Email allready exist', 500);
            return next(error)
        }

        if(image === '' || imgId === ''){
            const error = new HttpError("Can't create account", 500);
            return next(error)
        }

        const hasedPassword = await bcrypt.hash(password, 12);
        const user = {
            email,
            username,
            password: hasedPassword,
            image,
            imgId
        };

        const token = jwt.sign({user}, process.env.SECRET, { expiresIn : process.env.MAIL_TOKEN_EXP_TIME })

        const msg = {
            to: email,
            from: process.env.EMAIL_SERVICE_USER,
            subject: 'Account Verification',
            html: `
                <h2>Hi ${username}</h2>
                <p>Please click on given link to activate your account for UConnect.</p>
                <p>${process.env.CLIENT_URL}/authentication/active/${token}</p>
            `
        };

        await sendEmailUsingNodemailer(msg);
        res.status(200).json({ msg: 'Please check email for account verification.' });
    
    } catch (error) {
        next(new HttpError('Server Error', 500))
    }
}

exports.accountVerification = async (req, res, next) => {
    try {
        const { token } = req.body;

        if(token){
            jwt.verify(token, process.env.SECRET, async (err, decodedToken) => {
                if(err){
                    const error = new HttpError('Incorrect or Expired Link', 500);
                    return next(error)
                }

                const isUser = await User.findOne({ email: decodedToken.user.email })
                if(isUser){
                    const error = new HttpError('Allready Verified.', 500);
                    return next(error)
                }
    
                const user = new User(decodedToken.user);
                await user.save();
                res.status(201).json({ msg: "Account Verified." })
            });

        } else {
            const error = new HttpError('Something went wrong', 500);
            return next(error)
        }
    } catch (error) {
        next(new HttpError('Server Error', 500))
    }
}

exports.forgetPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({email});
        if(!user){
            const error = new HttpError('User with this email does not exist', 500);
            return next(error)
        }

        const token = jwt.sign({ id: user._id }, process.env.RESET_PASSWORD_KEY, { expiresIn: process.env.MAIL_TOKEN_EXP_TIME});
        const msg = {
            to: email,
            from: process.env.EMAIL_SERVICE_USER,
            subject: 'Reset Password',
            html: `
                <h2>Hi ${user.username}</h2>
                <p>Please click on given link for password reset.</p>
                <p>${process.env.CLIENT_URL}/resetPassword/${token}</p>
            `
        };
      
        await sendEmailUsingNodemailer(msg);
        return res.status(200).json({ msg: 'Please check your email for password reset'})
    } catch (error) {
        next(new HttpError('Server Error', 500))
    }
}

exports.resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;

        if(token){
            jwt.verify(token, process.env.RESET_PASSWORD_KEY, async (err, decodedToken) => {
                if(err){
                    const error = new HttpError('Incorrect or Expired Link', 500);
                    return next(error)
                }

                const user = await User.findById(decodedToken.id);
                if(!user){
                    const error = new HttpError('Can not assign new password', 500);
                    return next(error)
                }
    
                const hasedPassword = await bcrypt.hash(password, 12);
                user.password = hasedPassword;
                await user.save();
                res.status(201).json({ msg: "Password changed Successfully" })
            });

        } else {
            const error = new HttpError('Something went wrong', 500);
            return next(error)
        }
    } catch (error) {
        next(new HttpError('Server Error', 500))
    }
}

exports.login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            let msg = errors.errors[0].msg;
            const error = new HttpError(msg, 500);
            return next(error)
        }

        const { email, password } = req.body;
        if(!email || !password){
            const error = new HttpError('Please provide all the fields', 500);
            return next(error)
        }
        
        const user = await User.findOne({ email: email })
        if(!user){
            const error = new HttpError('User not found', 404);
            return next(error)
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if(!passwordMatch){
            const error = new HttpError('Incorrect Password', 403);
            return next(error)       
        }

        const token = jwt.sign({ userId: user._id }, process.env.SECRET, { expiresIn: process.env.EXPIRATION_TIME })

        res.status(200).json({ token: token, msg: 'Login' })
    } catch (error) {
        next(new HttpError('Server Error', 500))
    }
}
