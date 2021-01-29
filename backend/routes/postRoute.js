const router = require('express').Router();
const { check } = require('express-validator');
const fileUploadFun = require('../middleware/fileUpload');

const { getPosts, getPost, getPostByUser, getPostsForHome, deletePost, createPost, likePost, postComment, deleteComment, updatePostCaption, updatePostMedia, deleteCommentFromMyPost } = require('../controller/postController');

//  For Development Only
router.get('/', getPosts);

//  Get a specific post
router.get('/:postId', getPost);

//  Get posts of a specific user
router.get('/user/:userId', getPostByUser);

//  Get posts of your connections
router.get('/show-posts/:userId', getPostsForHome)

//  Delete Post of user
router.delete('/:postId/:userId/delete', deletePost);

//  Create Post
router.post('/create', 
fileUploadFun('uploads/media').single('mediaFile'),
[
    check('caption').not().isEmpty().not().isNumeric().trim().withMessage('Please enter valid caption').isLength({ max: 200 }).withMessage('Caption should not be very large')
],
createPost)

//  Update Post Caption
router.patch('/:postId/update-caption', 
[
    check('caption').not().isNumeric().trim().withMessage('Please enter valid caption').isLength({ max: 200 }).withMessage('Caption should not be very large')
],
updatePostCaption)

//  Update Post Media
router.patch('/:postId/update-media', fileUploadFun('uploads/media').single('mediaFile'), updatePostMedia);

//  Like-UnLike a Post
router.post('/:postId/:userId/like-unlike', likePost);

//  Comment on a Post
router.post('/:postId/comment', 
[
    check('comment').not().isEmpty().not().isNumeric().trim().withMessage('Please enter valid comment').isLength({ max: 100 }).withMessage('Comment should not be very large')   
], 
postComment)

//  Delete Comment
router.delete('/:postId/:userId/comment', deleteComment)

//  Delete Comment from Auth User's Post
router.delete('/:postId/:userId/:authId/auth-comments', deleteCommentFromMyPost)

module.exports = router;