const router = require('express').Router();
const { check } = require('express-validator');

const { updateProfilePic, getUsers, getUser, getUserByName, deleteUser, writeAboutUser, deleteAboutUser, connectUser, blockUser } = require('../controller/userController');

//  Get all Users
router.get('/', getUsers);

//  Get a specific User
router.get('/:userId', getUser);

//  Get a specific User By Username
router.get('/username/:username', getUserByName);

//  Delete Account
router.delete('/:userId', deleteUser);

//  Update Profile Pic
router.post('/:userId/update-image', updateProfilePic)

//  Create About Section
router.patch('/about/:userId',
[
    check('profession').not().isNumeric().trim().withMessage('Please enter valid profession').isLength({ max: 50 }).withMessage('Profession must be less then 50 chars'),
    check('bio').not().isNumeric().trim().withMessage('Please enter valid bio').isLength({ max: 100 }).withMessage('Bio should not be very large'),
    check('location').not().isNumeric().trim().withMessage('Please enter valid address').isLength({ max: 50 }).withMessage('Location must be less then 50 chars')
], 
writeAboutUser);

//  Delete About Section
router.delete('/about/:userId', deleteAboutUser);

//  Connect User
router.post('/:userId/connect/:user', connectUser);

//  Block User
router.post('/:userId/block/:user', blockUser);

module.exports = router;