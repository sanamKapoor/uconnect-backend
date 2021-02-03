const io = require('../socket');
const HttpError = require('../middleware/error');
const { validationResult } = require('express-validator');
const { destroyMedia } = require('../middleware/cloudinary');

const User = require('../model/User');
const Post = require('../model/Post');

//  Get all Users
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find({}, '-password');

        if(!users || users.length === 0){
            const error = new HttpError("No user found", 404);
            return next(error)
        }

        res.status(200).json({ msg: 'All Users', users })
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Get User
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId.toString(), '-password');

        if(!user){
            const error = new HttpError("No user found", 404);
            return next(error)
        }

        res.status(200).json({ msg: 'User', user })
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Get User by Username
exports.getUserByName = async (req, res, next) => {
    try {
        const users = await User.find({username: req.params.username}, '-password');

        if(!users || users.length === 0){
            const error = new HttpError("No user found", 404);
            return next(error)
       }

        res.status(200).json({ msg: 'Users by Username', users })
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Update Profile
exports.updateProfilePic = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId.toString());

        if(!user || req.user._id.toString() !== req.params.userId.toString()){
            const error = new HttpError("Can't update profile picture", 403);
            next(error);
        }

        user.imgId && await destroyMedia(user.imgId)
        const { img_url, img_id } = req.body;
        if(img_id === '' || img_url === ''){
            const error = new HttpError("Can't update profile picture", 403);
            next(error);
        }

        user.image = img_url;
        user.imgId = img_id;
        await user.save();

        io.getIO().emit('users', { action: 'GetUser', user: user, otherUser: null })
        res.status(200).json({ msg: 'User Image Updated'})
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Delete User
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId.toString(), '-password');

        if(!user || req.user._id.toString() !== req.params.userId.toString()){
            const error = new HttpError("Can not delete user", 404);
            return next(error)
        }

        //  Delete all my Posts
        const posts = await Post.find({ creator: user._id });
        if(posts.length > 0){
            for(let post of posts){
                post.mediaFile.mediaId && await destroyMedia(post.mediaFile.mediaId)
                await post.remove();
            }
        }

        //  Delete all my likes and comments on other posts
        const allPosts = await Post.find();
        if(allPosts.length > 0){
            for(let post of allPosts){
                const likeArr = post.likes;
                const commentArr = post.comments;

                // Remove from like array
                if(likeArr.length > 0){
                    const myIndex = likeArr.map(u => u.toString()).indexOf(user._id);
                    likeArr.splice(myIndex, 1);
                }

                // Remove from comment array
                if(commentArr.length > 0){
                    const myIndex = commentArr.map(u => u.user.toString()).indexOf(user._id);
                    commentArr.splice(myIndex, 1);
                }

                await post.save();
            }
        }

        //  Delete from other user's connection list
        if(user.connections.length > 0){
            for(let connection of user.connections){
                const myConnection = await User.findById(connection);
                const myIndex = myConnection.connections.map(u => u.toString()).indexOf(user._id);
                myConnection.connections.splice(myIndex, 1);
                await myConnection.save();
            }
        }

        user.imgId && await destroyMedia(user.imgId);

        await user.remove();
        res.status(200).json({ msg: 'User Deleted'})
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Write about User (Profession, Bio, Location)
exports.writeAboutUser = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            let msg = errors.errors[0].msg;
            const error = new HttpError(msg, 500);
            return next(error)
        }

        const user = await User.findById(req.params.userId.toString());

        if(!user || req.user._id.toString() !== req.params.userId.toString()){
            const error = new HttpError("Not Authorized", 403);
            return next(error)
        }

        user.profession = req.body.profession ? req.body.profession : user.profession;
        user.bio = req.body.bio ? req.body.bio : user.bio;
        user.location = req.body.location ? req.body.location : user.location;

        await user.save();

        io.getIO().emit('users', { action: 'GetUser', user: user, otherUser: null })
        res.status(201).json({ msg: 'User Bio updated' })
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Delete about section
exports.deleteAboutUser = async (req, res, next) => {
    try {
        let user = await User.findById(req.params.userId.toString());
        if(!user || req.user._id.toString() !== req.params.userId.toString()){
            const error = new HttpError("Not Authorized", 403);
            return next(error)
        }

        await User.updateOne({ _id: user }, {$unset: { profession: 1, bio: 1, location: 1 }})
        await user.save();
        
        const updatedUser = await User.findById(req.params.userId.toString());

        io.getIO().emit('users', { action: 'GetUser', user: updatedUser, otherUser: null })
        res.status(200).json({ msg: 'User Bio Deleted' })
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}

//  Connect other User
exports.connectUser = async (req, res, next) => {
    try {
        const otherUser = await User.findById(req.params.userId.toString());
        const user = await User.findById(req.params.user.toString());

        if(
            !otherUser || 
            !user || 
            otherUser.toString() === user.toString() ||
            req.user._id.toString() !== req.params.user.toString()
        ){
            const error = new HttpError('Can not connect user', 401);
            return next(error)
        }

        let allreadyConnected = false;
        
        for(let u of otherUser.connections){
            if(u.toString() === user._id.toString()){
                allreadyConnected = true;
                break;
            } else {
                allreadyConnected = false;
            }
        }

        for(let u of user.connections){
            if(u.toString() === otherUser._id.toString()){
                allreadyConnected = true;
                break;
            } else {
                allreadyConnected = false;
            }
        }

        if(!allreadyConnected){
            otherUser.connections.push(user._id);
            user.connections.push(otherUser._id);
        } 

        await otherUser.save();
        await user.save();

        io.getIO().emit('users', { action: 'ConnectOrBlockUser', user: user, otherUser: otherUser })
        if(allreadyConnected){
            res.status(200).json({ msg: 'You allready connected with this user' })
        } else {
            res.status(200).json({ msg: 'You made a new connection' })
        }
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}


//  Block other User
exports.blockUser = async (req, res, next) => {
    try {
        const otherUser = await User.findById(req.params.userId.toString());
        const user = await User.findById(req.params.user.toString());

        if(
            !otherUser || 
            !user || 
            otherUser.toString() === user.toString() ||
            req.user._id.toString() !== req.params.user.toString()
        ){
            const error = new HttpError("Can not block user", 401);
            return next(error)
        }

        let Block = false;
        
        for(let u of user.connections){
            if(u.toString() === otherUser._id.toString()){
                Block = true;
                break;
            } else {
                Block = false;
            }
        }

        for(let u of otherUser.connections){
            if(u.toString() === user._id.toString()){
                Block = true;
                break;
            } else {
                Block = false;
            }
        }

        if(Block){
            //  Delete from user's followers list
            let removeIndexOfOtherUser = user.connections.map(u => u.toString()).indexOf(otherUser._id);
            user.connections.splice(removeIndexOfOtherUser, 1);

            //  Delete from other's following list
            let removeIndexOfUser = otherUser.connections.map(u => u.toString()).indexOf(user._id);
            otherUser.connections.splice(removeIndexOfUser, 1);
        } 

        await otherUser.save();
        await user.save();

        io.getIO().emit('users', { action: 'ConnectOrBlockUser', user: user, otherUser: otherUser })
        if(Block){
            res.status(200).json({ msg: 'You Blocked a user' })
        } else {
            res.status(200).json({ msg: 'You can not Block a user which does not exits' })
        }
    } catch (error) {
        return next(new HttpError('Server Error', 500))
    }
}