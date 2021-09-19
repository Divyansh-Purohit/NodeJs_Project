const express = require('express');
const router = express.Router();

const { check, body } = require('express-validator');
//syntax to import a sub package
//'check' checks the body, params, query, etc params of the request.

const authController = require('../controllers/auth');

const User = require('../models/user');

router.get('/login', authController.getLogin);

router.post('/login',
[
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email address.')
        .normalizeEmail(),
    body('password', 'Password has to be valid.')
        .isLength({min: 5})
        .isAlphanumeric()
        .trim()
],
authController.postLogin);

router.get('/signup', authController.postSignUp);

router.post('/signup', 
//multiple validators can be chained.
[
    check('email')
    //check('email') returns an object
    //call the method isEmail on the object
    //return a middleware that stores/collects the errors.

        .isEmail()
        .withMessage('Please enter a valid email.')
        .custom((value, {req}) => {
            // if(value === 'test@test.com'){
            //     throw new Error('Forbidden Email.');
            //     return false to go with the default error message.
            // }
            // return true;
        
            return User.findOne({email: value})
            //Async Validation because we reach to the database for validating

            .then(userDoc => {
                if(userDoc){
                    return Promise.reject('Email already registered, proceed to login')
                }
            });        
        })
        .normalizeEmail(),
    check('password', 'Password must contain atleast 8 characters, alphanumeric.')
        //provide default message as a second parameter to check
        //works on all the validators defined.
        .isLength({min: 8})
        .isAlphanumeric()
        .trim(),
    check('confirmPassword')
        .trim()
        .custom((value, {req}) => {
            if(value !== req.body.password){
                throw new Error('Passwords do not match.')
            }
            return true;
        })
],
authController.postSignUp);

router.post('/logout', authController.postLogout);

router.get('/reset-password', authController.getReset);

router.post('/reset-password', authController.postReset);

router.get('/reset-password/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;