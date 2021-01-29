require('dotenv').config();
const HttpError = require('./error');

const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadImage = async (path, preset) => {
    try {
        const res = await cloudinary.uploader.upload(path, {
            upload_preset: preset,
        });
    
        return res;
    } catch (error) {
        next(new HttpError('Server Error', 500))
    } 
}

exports.destroyMedia = async (id) => {
    try {
        await cloudinary.uploader.destroy(id);
    } catch (error) {
        next(new HttpError('Server Error', 500))
    }
}