const fs = require('fs');
const { validationResult } = require('express-validator');
const HttpError = require('../middleware/error');
const User = require('../model/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const { uploadImage } = require('../middleware/cloudinary');

exports.register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            let msg = errors.errors[0].msg;
            const error = new HttpError(msg, 500);
            return next(error)
        }

        const { username, email, password } = req.body;
        if(!username || !email || !password){
            const error = new HttpError('Please provide all the fields', 500);
            return next(error)
        }
        console.log(req.file)
        const img = req.file;
        if(!img){
            const error = new HttpError('Please provide profile picture', 500);
            return next(error)
        }

        if(img.mimetype !== 'image/jpg' && img.mimetype !== 'image/jpeg' && img.mimetype !== 'image/png'){
            const error = new HttpError("Only image file accepted", 500);
            return next(error)
        }

        const isUser = await User.findOne({ email: email })
        if(isUser){
            const error = new HttpError('Email allready exist', 500);
            return next(error)
        }

        console.log(img.path)
        const imgUrl = await uploadImage(img.path, 'uconnect-users');
        if(!imgUrl){
            const error = new HttpError('Unable to create account', 500);
            return next(error)
        }

        const hasedPassword = await bcrypt.hash(password, 12);
        const user = new User({
            email,
            username,
            password: hasedPassword,
            image: imgUrl.secure_url,
            imgId: imgUrl.public_id
        });

        await user.save();
//         user.imgId && fs.unlink(img.path, err => console.log(err));

        res.status(200).json({ msg: 'Account Created!' });

        // const token = jwt.sign({user}, process.env.SECRET, { expiresIn : process.env.MAIL_TOKEN_EXP_TIME })

        // const msg = {
        //     to: email,
        //     from: 'purlwillson786@gmail.com@gmail.com',
        //     subject: 'Account Verification',
        //     html: `
        //         <h2>Please click on given link to activate your account.</h2>
        //         <p>${process.env.CLIENT_URL}/authentication/active/${token}</p>
        //     `
        // };
        // sgMail.send(msg, function (error, body) {
        //     if(error){
        //         const err = new HttpError('Something went wrong', 500);
        //         return next(err)   
        //     }
        //     return res.status(200).json({ msg: 'Please check your email to activate your account'})
        // });
    
    } catch (error) {
        next(new HttpError('Server Error', 500))
    }
}

// exports.accountVerification = async (req, res, next) => {
//     try {
//         const { token } = req.body;

//         if(token){
//             jwt.verify(token, process.env.SECRET, async (err, decodedToken) => {
//                 if(err){
//                     const error = new HttpError('Incorrect or Expired Link', 500);
//                     return next(error)
//                 }

//                 const isUser = await User.findOne({ email: decodedToken.user.email })
//                 if(isUser){
//                     const error = new HttpError('Allready Verified.', 500);
//                     return next(error)
//                 }
    
//                 const user = new User(decodedToken.user);
//                 await user.save();
//                 res.status(201).json({ msg: "Account Verified." })
//             });

//         } else {
//             const error = new HttpError('Something went wrong', 500);
//             return next(error)
//         }
//     } catch (error) {
//         next(new HttpError('Server Error', 500))
//     }
// }

// exports.forgetPassword = async (req, res, next) => {
//     try {
//         const { email } = req.body;

//         const user = await User.findOne({email});
//         if(!user){
//             const error = new HttpError('User with this email does not exist', 500);
//             return next(error)
//         }

//         const token = jwt.sign({ id: user._id }, process.env.RESET_PASSWORD_KEY, { expiresIn: process.env.MAIL_TOKEN_EXP_TIME});
//         const data = {
//             to: email,
//             from: 'sanamkapoor3285@gmail.com',
//             subject: 'Reset Password',
//             html: `
//                 <h2>Please click on given link for password reset.</h2>
//                 <p>${process.env.CLIENT_URL}/resetPassword/${token}</p>
//             `
//         };
//         sgMail.send(data, function (error, body) {
//             if(error){
//                 const err = new HttpError('Something went wrong', 500);
//                 return next(err)   
//             }

//             return res.status(200).json({ msg: 'Please check your email for password reset'})
//         });
//     } catch (error) {
//         next(new HttpError('Server Error', 500))
//     }
// }

// exports.resetPassword = async (req, res, next) => {
//     try {
//         const { token, password } = req.body;

//         if(token){
//             jwt.verify(token, process.env.RESET_PASSWORD_KEY, async (err, decodedToken) => {
//                 if(err){
//                     const error = new HttpError('Incorrect or Expired Link', 500);
//                     return next(error)
//                 }

//                 const user = await User.findById(decodedToken.id);
//                 if(!user){
//                     const error = new HttpError('Can not assign new password', 500);
//                     return next(error)
//                 }
    
//                 const hasedPassword = await bcrypt.hash(password, 12);
//                 user.password = hasedPassword;
//                 await user.save();
//                 res.status(201).json({ msg: "Password changed Successfully" })
//             });

//         } else {
//             const error = new HttpError('Something went wrong', 500);
//             return next(error)
//         }
//     } catch (error) {
//         next(new HttpError('Server Error', 500))
//     }
// }

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
