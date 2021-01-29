const multer = require('multer');

const MIME_TYPE_MAP = {
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/jpeg': 'jpeg'
}

function fileUploadFun(path, size = 6000000){
    const fileUpload = multer({
        limits: { fileSize: size },
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, './backend/' + path)
            },
            filename: (req, file, cb) => {
                cb(null, Date.now() + '-' + file.originalname)
            } 
        }),
        fileFilter: (req, file, cb) => {
            const isValid = !!MIME_TYPE_MAP[file.mimetype];
            let error = isValid ? null : new Error('Invalid file type')
            cb(error, isValid)
        }
    });
    

    return fileUpload;
}

module.exports = fileUploadFun;