require('dotenv').config();
const HttpError = require('./error');

const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.destroyMedia = async (id, next) => {
    try {
        console.log('ID -----', id);
        await cloudinary.uploader.destroy(id, { invalidate: true, resource_type: "image" }, result => {
            console.log(result);
        });
    } catch (error) {
        next(new HttpError('Server Error', 500))
    }
}