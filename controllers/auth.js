const crypto = require('crypto');
//built in library provided by nodejs to generate tokens.(unique, secure, random values)

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendGridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator');

const User = require('../models/user');

const transporter = nodemailer.createTransport(
    sendGridTransport({
        auth: {
            api_key:
               process.env.NODEMAILER_SG_KEY
        }
    })
);

exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0)
        message = message[0];
    else    
        message = null;
    res.render('auth/login', {
        pageTitle: 'Login',
        path:'/login',
        errorMessage: message,
        oldInput: {
            email: '',
            password: ''
        },
        validationErrors: []
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.login;
    const password = req.body.password;

    const errors = validationResult(req);
    //validationResult(req) will go through the error object
    //and collect all the errors in the 'errors' constant.

    if(!errors.isEmpty()){
        return res.status(422).render('/auth/login', {
            pageTitle: 'Login',
            path: '/login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: errors.array()
        })
    }
    User.findOne({email: email})
    .then(user => {
        if(!user){
            return res.status(422).render('auth/login', {
                pageTitle: 'Login',
                path: '/login',
                errorMessage: 'Invalid email or password',
                oldInput: {
                    email: email,
                    password: password
                },
                validationErrors: []
                
            })
        }
            // req.flash('error', 'Invalid email or password');
            // //key value pair: 'error' -> key, 'Invalid email or password' -> value
            // return res.status(422).redirect('/login');
    
        bcrypt
        .compare(password, user.password)
        .then(doMatch => {
            if(doMatch){
                req.session.isLoggedIn = true;
                //saving isLoggedIn for each and every request for the req.user
                req.session.user = user;
                req.session.save(err => {
                    console.log(err);
                    res.redirect('/');
                });       
            }
            // req.flash('error', 'Invalid Email or Password');
            // res.redirect('/login');
            return res.status(422).render('auth/login', {
                pageTitle: 'Login',
                path: '/login',
                errorMessage: 'Invalid email or password',
                oldInput: {
                    email: email,
                    password: password
                },
                validationErrors: []
            });
        })
        .catch(err => {
            console.log(err);
            res.redirect('/login');
        });
    })
    .catch(err => {
        console.log(err);
    });
};

exports.getSignUp = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0)
        message = message[0];
    else
        message = null;
    res.render('auth/signup', {
        pageTitle: 'Signup',
        path: '/signup',
        errorMessage: message,
        oldInput: {
            email: "",
            password: "",
            confirmPassword: ""
        },
        //to save user input,
        //even if the user enters wrong/invalid values, the entered data isn't lost
        validationErrors: []
    });
};

exports.postSignUp = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
     
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('/auth/signup', {
            pageTitle: 'Sign-up',
            path: '/signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: req.body.password
            },
            validationErrors: errors.array()
        });
    }
    // user.findOne({email: email})
    // .then(userDoc => {
    //     if(userDoc){
    //         req.flash('error', 'Email already exists, proceed to log in')
    //         return res.redirect('/signup');
    //     }
        //return bcrypt
    bcrypt
    .hash(password, 12)
    .then(hashedPassword => {
        const user = new User({
            email: email,
            password: hashedPassword,
            cart: {
                items:[]
            }
        });
        return user.save();
    })
    .then(result => {
        res.redirect('/login');
        // return transporter.sendMail({
        //     to: email,
        //     from: 'dp2012div@gmail.com',
        //     subject: "Sign-Up Succeeded!",
        //     html: '<h1>You Successfully Signed up</h1>'
        // });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.postLogout = (req, res, next) => {
    //Destroy the session entry in the sessions collection in the database.
    //Deleting just the cookie does't delete the session entry.
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
};

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0)
        message = message[0];
    else
        message = null;
    res.render('auth/reset', {
        pageTitle: 'Reset Password',
        path: '/reset-password',
        errorMessage: message 
    });
};
exports.postReset = (req, res, next) => {
    //generate 32 random bytes 
    crypto.randomBytes(32, (err, bufferOfBytes) => {
        //callback function
        if(err) {
            console.log(err);
            res.redirect('/reset-password');
        }
        const token = bufferOfBytes.toString('hex');
        //buffer will store hexaDecimal values.
        //this token should get store in the database inside the user object,
        //because it belongs to the user.

        User.find({email: req.body.email})
        .then(user => {
            if(!user){
                req.flash('error', 'No user with that email found.');
                res.redirect('/reset-password');
            }
            user.resetToken = token;
            user.resetTokenExpiry = Date.now() + 3600000;
            //current Date + 1 hour(expressed in mS)
            user.save();
        })
        .then(result => {
            //we know that the user exists in the database,
            //we want to sent the reset token email.
            res.redirect('/');
            transporter.sendMail({
                to: req.body.email,
                from: 'dp2012div@gmail.com',
                subject: "Reset Password",
                html: `
                <p>You have requested a password reset.<p>
                <p>Click this <a href="localhost:3000/reset-password/${token}">link</a> to reset your password.</p>
                `
            });
        })
        .catch(err  => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
    });    
};

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({token: resetToken, resetTokenExpiry: {$gt: Date.now()}})
    .then(user => {
        let message = req.flash('error');
        if(message.length > 0)
            message=message[0];
        else
            message=null;
        res.render('auth/new-password', {
            pageTitle: 'New Password',
            path: '/new-password',
            errorMessage: message,
            userId: user._id.toString(),
            passwordToken: token
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
    const password = req.body.password;
    // const confirmNewPassword = req.body.confirmNewPassword;
    const token = req.body.token;
    let resetUser;

    // if(confirmNewPassword === password){
    User.findOne({resetToken: token, resetTokenExpiry: {$gt: Date.now()}, _id: userId})
    .then(user => {
        resetUser = user;
        return bcrypt.hash(password, 12);
    })
    .then(hashedPassword => {
        resetUser.password = hashedPassword;
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiry = undefined;
        // return resetUser.save();
        return resetUser.save();
    })
    .then(result => {
        res.redirect('/login');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
    // }
    // else{
    //     req.flash('error', 'The two passwords do not match.');
    //     res.redirect('/new-password');
    // }
};