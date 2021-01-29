const router = require('express').Router();
const passport = require('passport');
const { check } = require('express-validator');
const fileUploadFun = require('../middleware/fileUpload');
const { register, login, accountVerification, forgetPassword, resetPassword } = require('../controller/authController');
require('dotenv').config();

//  Authentication with Google OAuth

router.get('/google', passport.authenticate('google', { scope: ['profile'] }))

router.get('/google/callback', passport.authenticate('google'), (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}/welcome?token=${req.user.token}`  )
})

router.get('/logout', (req, res) => {
    req.logout()
})

//  Authentication with Email and Password

router.post('/login',
[
    check('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    check('password').isLength({ min: 5 }).withMessage('Password must be at least 5 chars long')
],
login);

router.post('/register', 
fileUploadFun('uploads/user-images').single('image'),
[
    check('username').not().isEmpty().not().isNumeric().trim().withMessage('Please enter valid username'),
    check('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    check('password').isLength({ min: 5 }).withMessage('Password must be at least 5 chars long')
],
register)

// router.post('/email-active', accountVerification);
// router.post('/forgetPassword', forgetPassword);
// router.post('/resetPassword', resetPassword);

module.exports = router;