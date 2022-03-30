const nodemailer = require('nodemailer');
const HttpError = require('./error');

const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_SERVICE_USER,
        pass: process.env.EMAIL_SERVICE_PASSWORD
    }
})


exports.sendEmailUsingNodemailer = async (mailOptions) => {
    try {
        let mail = await transport.sendMail(mailOptions); 
    } catch (error) {
        console.log(error);
        throw new HttpError('Something went wrong', 500)
    }
}
