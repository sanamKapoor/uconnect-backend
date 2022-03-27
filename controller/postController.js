const io = require('../socket');
const HttpError = require('../middleware/error');
const { validationResult } = require('express-validator');
const { destroyMedia } = require('../middleware/cloudinary');

const User = require('../model/User');
const Post = require('../model/Post');

//  Get all Posts
exports.getPosts = async (req, res, next) => {
    try {
        const posts = await Post.find({});

        if(!posts || posts.length === 0){
            return next(new HttpError("No post found", 404))
        }

        res.status(200).json({ msg: 'All Posts', posts })
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Get Post
exports.getPost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.postId.toString()).populate('creator', ['username', 'image']);

        if(!post){
            const error = new HttpError("Post does not exist", 404);
            return next(error)
        }

        res.status(200).json({ msg: 'Post', post })
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Get Posts of a User
exports.getPostByUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId.toString());

        if(!user){
            const error = new HttpError("No post found for this user", 404);
            return next(error)
        }

        const posts = await Post.find({ creator: req.params.userId.toString()});

        if(!posts || posts.length === 0){
            const error = new HttpError(`${user.username} didn't post anything yet!`, 404);
            return next(error)
        }

        res.status(200).json({ msg: 'Your Posts', posts })

    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Get Posts of your connections
exports.getPostsForHome = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if(!user || req.user._id.toString() !== req.params.userId){
            const error = new HttpError("Can not find posts of your connections.", 404);
            return next(error)
        }

        let AllPosts = [];
        for(let u of user.connections){
            let userPosts = await 
                Post.find({ creator: u })
                .populate('creator', ['username', 'image'])

            userPosts.map(post => {
                AllPosts.unshift(post);
            })
        }

        if(AllPosts.length === 0){
            const error = new HttpError("Sorry, No posts for now but you can follow other users to see their posts!");
            return next(error)
        }

        res.status(200).json({ msg: 'Posts for home page', posts: AllPosts })
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Create Post
exports.createPost = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            let msg = errors.errors[0].msg;
            const error = new HttpError(msg, 500);
            return next(error)
        }

        const user = await User.findById(req.body.creator.toString());
        if(!user || req.user._id.toString() !== req.body.creator.toString()){
            const error = new HttpError("Can not create post", 403);
            return next(error)
        }

        if(req.body.mediaFile.filePath === '' || req.body.mediaFile.filePath === undefined){
            const error = new HttpError("Please provide image file", 500);
            return next(error)
        }

        const post = new Post({
            caption: req.body.caption,
            mediaFile: req.body.mediaFile,
            creator: user
        });
        await post.save();
        await user.posts.push(post);
        await user.save();

        res.status(201).json({ msg: 'Post Created' })
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Update Post Caption
exports.updatePostCaption = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            let msg = errors.errors[0].msg;
            const error = new HttpError(msg, 500);
            return next(error)
        }

        const postId = req.params.postId.toString();
        const creator = req.body.creator.toString();

        const post = await Post.findById(postId);

        if(!post){
            const error = new HttpError("Can not update post", 404);
            return next(error)
        }

        if(post.creator.toString() !== creator || req.user._id.toString() !== creator){
            const error = new HttpError("Sorry you can not update this post", 403);
            return next(error)
        }

        post.caption = req.body.caption ? req.body.caption : post.caption;
        await post.save();

        res.status(200).json({ msg: 'Post Caption Updated'})
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Update Post Media
exports.updatePostMedia = async (req, res, next) => {
    try {
        const postId = req.params.postId.toString();
        const creator = req.body.creator.toString();

        const post = await Post.findById(postId);

        if(!post){
            const error = new HttpError("Can not update post", 404);
            return next(error)
        }

        if(post.creator.toString() !== creator || req.user._id.toString() !== creator){
            const error = new HttpError("Sorry you can not update this post", 403);
            return next(error)
        }

        if(req.body.mediaFile.filePath === '' || req.body.mediaFile.filePath === undefined){
            const error = new HttpError("Please provide image file", 500);
            return next(error)
        }
        
        let deleted = false;
        if(post.mediaFile.mediaId) deleted = await destroyMedia(post.mediaFile.mediaId, next);
        !deleted && new HttpError("Something went wrong", 500) 

        post.mediaFile = req.body.mediaFile;
        await post.save();

        res.status(200).json({ msg: 'Post Media Updated'})
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Delete Post
exports.deletePost = async (req, res, next) => {
    try {
        const postId = req.params.postId.toString();
        const userId = req.params.userId.toString();

        const post = await Post.findById(postId);

        if(!post){
            const error = new HttpError("Can not delete post", 404);
            return next(error)
        }

        if(post.creator.toString() !== userId || req.user._id.toString() !== userId){
            const error = new HttpError("Sorry you can't delete this post", 403);
            return next(error)
        }


        let deleted = false;
        if(post.mediaFile.mediaId) deleted = await destroyMedia(post.mediaFile.mediaId, next);
        !deleted && new HttpError("Something went wrong", 500) 
        
        await post.remove();

        const creator = await User.findById(userId);
        let removeIndex = creator.posts.map(u => u.toString()).indexOf(postId);
        creator.posts.splice(removeIndex, 1);
        await creator.save();

        io.getIO().emit('posts', { action: 'GetAllPosts', creator: creator })
        res.status(200).json({ msg: 'Post Deleted'})
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Like Post
exports.likePost = async (req, res, next) => {
    try {
        const userId = req.params.userId.toString();

        const post = await Post.findById(req.params.postId.toString()).populate('creator', ['username', 'image']);
        if(!post){
            const error = new HttpError("Can't like or dislike this post", 404);
            return next(error)
        }
 
        const user = await User.findById(userId);
        if(!user || req.user._id.toString() !== userId){
            const error = new HttpError("Can't like or dislike this post", 401);
            return next(error)
        }

        if(post.likes.length === 0){
            post.likes.unshift(userId)
        } else {
            let allreadyLiked = true;
            for(let user of post.likes){
                if(user.toString() === userId){
                    allreadyLiked = true;
                    break;
                } else {
                    allreadyLiked = false;
                } 
            }

            if(!allreadyLiked){
                post.likes.unshift(userId);
            } else {
                let removeIndex = post.likes.map(u => u.toString()).indexOf(userId);
                post.likes.splice(removeIndex, 1);
            }
        }
        await post.save();

        io.getIO().emit('posts', { action: 'GetPost', data: post  })
        res.status(200).json({ msg: 'Success Like or UnLike' })
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
} 

//  Comment on a Post
exports.postComment = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            let msg = errors.errors[0].msg;
            const error = new HttpError(msg, 500);
            return next(error)
        }

        const userId = req.body.user.toString();

        const post = await Post.findById(req.params.postId.toString()).populate('creator', ['username', 'image']);
        if(!post){
            const error = new HttpError("Can't comment on this post", 404);
            return next(error)
        }

        const user = await User.findById(userId);
        if(!user || req.user._id.toString() !== userId){
            const error = new HttpError("Can't comment on this post", 401);
            return next(error)
        }

        if(post.comments.length === 0){
            post.comments.push({
                text: req.body.comment,
                user: userId
            })
        } else {
            let allreadyCommented = true;
            for(let obj of post.comments){
                if(obj.user.toString() === userId){
                    obj.text = req.body.comment;
                    allreadyCommented = true;
                    break;
                } else {
                    allreadyCommented = false;
                }
            }

            if(!allreadyCommented){
                post.comments.push({
                    text: req.body.comment,
                    user: userId
                })
            }
        }

        await post.save();

        io.getIO().emit('posts', { action: 'GetPost', data: post  })
        res.status(201).json({ msg: 'Comment posted successfully' })
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Delete Comment
exports.deleteComment = async (req, res, next) => {
    try {
        const userId = req.params.userId.toString();
        const postId = req.params.postId.toString();

        const post = await Post.findById(postId).populate('creator', ['username', 'image']);
        if(!post){
            const error = new HttpError("Can't delete comment", 404);
            return next(error)
        }

        const user = await User.findById(userId);
        if(!user || req.user._id.toString() !== userId){
            const error = new HttpError("Can't delete comment", 404);
            return next(error)
        }

        let haveNotCommented = false;
        if(post.comments.length === 0){
            haveNotCommented = true;
        } else {
            for(let obj of post.comments){
                if(obj.user.toString() === userId){
                    let removeIndex = post.comments.map(u => u.user.toString()).indexOf(userId);
                    post.comments.splice(removeIndex, 1);
                    haveNotCommented = false;
                    break;
                } else {
                    haveNotCommented = true;
                }
            }
        }
        
        await post.save();

        io.getIO().emit('posts', { action: 'GetPost', data: post })
        if(haveNotCommented){
            res.status(200).json({ msg: 'You have not commented on this post yet' })
        } else {
            res.status(200).json({ msg: 'Comment deleted successfully' })
        }
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Delete Comment from Auth User's Post
exports.deleteCommentFromMyPost = async (req, res, next) => {
    try {
        const userId = req.params.userId.toString();
        const postId = req.params.postId.toString();
        const authUser = req.params.authId.toString();

        const post = await Post.findById(postId).populate('creator', ['username', 'image']);
        if(!post){
            const error = new HttpError("Can't delete comment", 404);
            return next(error)
        }

        const user = await User.findById(userId);
        if(!user){
            const error = new HttpError("Can't delete comment", 404);
            return next(error)
        }
    
        if(post.creator._id.toString() === authUser && req.user._id.toString() === authUser){
            for(let obj of post.comments){
                if(obj.user.toString() === userId){
                    let removeIndex = post.comments.map(u => u.user.toString()).indexOf(userId);
                    post.comments.splice(removeIndex, 1);
                    break;
                }
            }
        } else {
            const error = new HttpError("Not Authorized", 403);
            return next(error)
        }

        await post.save();

        io.getIO().emit('posts', { action: 'GetPost', data: post })
        res.status(200).json({ msg: 'Comment deleted successfully' })

    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}
