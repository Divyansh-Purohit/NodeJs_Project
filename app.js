// NODE_ENV = production => express will reduce the details of the errors thrown,
//optimize something for deployment.
//Hosting providers do set the NODE_ENV to production for us.

//helmet is used to set secure headers to responses we send.
//compression is used to compress assets.
//morgan makes logging request data a lot more easier

const path = require('path');
const fs = require('fs');
const https = require('https');

const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
//express session package will store the sessions data in the database
//sessions data shouldn't be stored in the memory risk of memory overflow.
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const errorController = require('./controllers/error');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');


const User = require('./models/user');

//const private_key = fs.readFileSync('server.key');
//const certificate = fs.readFileSync('server.cert');

const MONGODB_URI =
`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.sh0gw.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;


const app = express();
const csrfProtection = csrf();

app.set('view engine', 'ejs');
app.set('views', 'views');


//set up the store to save our sessions
const store = new MongoDBStore({
    uri: MONGODB_URI,
    //connection string, tells the store in which database to store sessions data.
    databaseName: 'shop',
    collection: 'sessions'
    //collection inside the database where the sessions data is to be stored.
});

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
        //directory where the uploaded images will be stored.
    },
    filename: (req, file, cb) => {
        //cb(null, new Date().toISOString() + '-' + file.originalname);
        cb(null, new Date().getMilliseconds().toString() + '-' + file.originalname);
        //nameing scheme of the uploaded files.
        //new Date().toISOString() -> gurantees unique names.
    }
});

const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
        //only .png, .jpg and .jpeg file are allowed.
       cb(null, true) ;
    } else {
        cb(null, false);
    }
};

app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
//images are statically served, like the files in the 'public' directory.

//Initialize the multer object with configurations for storage and filter.
app.use(multer({
    storage: fileStorage,  //storing and naming 
    fileFilter: fileFilter//checking for mimetypes
}).single('image'));


//Initialize the session middleware.
app.use(session({
    secret: 'abcd secret',
    saveUninitialized:false,
    resave: false, //won't resave for every request, only when there is a change.
    store: store
}));

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'), {
        flags: 'a'
        //new logs will be appended to the log file and not overwritten.
    }
)

app.use(csrfProtection);
app.use(flash());
app.use(helmet());
app.use(compression());
//compression doesn't compress the image files, as compressed images take longer to load.
//most hosting providers provide the compresiion on the fly.
app.use(morgan('combined', {stream: accessLogStream}));


//general middleware to set the isAuthenticated value to all requests
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use((req, res, next) => {//get the user from a session
    if(!req.session.user){
        return next();
        //If the user has an ongoing session, then simply go to the next middleware!
        //Check for the existance of the session
    }
    //Else find the user ID in the database and store the returned user in the request object.
    User.findById(req.session.user._id)
    .then(user => {
        if(!user){ //check for the user, incase the user might have been deleted in some database operation.
            return next();
        }
        req.user = user; //through the entire life of the request we can access the user object.
        next();
    })
    .catch(err => { //console.log(err)
        throw new Error(err);
    });
});

app.use('/admin', adminRoutes);
app.use('/', shopRoutes);
app.use(authRoutes); //500 for server side failure of operations.
app.get('/500', errorController.get500);
app.use(errorController.get404);


//express error handling middleware for errors that are thrown.
app.use((error, req, res, next) => {
    //res.status(error.httpStatusCode).render(...);
    //res.redirect('/500');
    console.log(error);
    res.status(500).render('500', {
        pageTitle: 'Error',
        path: '/500',
        isAuthenticated: req.session.isLoggedIn
    });
});

mongoose
.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true})
.then(result => {
    app.listen(process.env.PORT || 8000);
    // https
    // .createServer({key: private_key, cert: certificate}, app)
    // .listen(process.env.PORT || 8000)
})
.catch(err => console.log(err));

