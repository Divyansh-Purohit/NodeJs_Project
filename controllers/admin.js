const { validationResult } = require('express-validator');

const fileHelper = require('../util/file');

const Product = require('../models/product');

exports.getProducts = (req, res, next) => {
    Product.find({userId: req.user._id})
    .then(products => {
        console.log(products);
        res.render('/admin/products', {
            pageTitle: 'Admin Products',
            prods: products,
            path: '/admin/products',
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        //isAuthenticated: req.session.isLoggedIn. Now no need to specify the 'isAuthenticated' since we have used a middleware as a helper.
        hasError: false,
        errorMessage: null,
        validationErrors: []
    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const price = req.body.price;
    //const imageUrl = req.body.imageUrl;
    const image = req.file;
    const description = req.body.description;

    if(!image){
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: 'File attached is not an image.',
            validationErrors: []
        });
    }
    
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                imageUrl: imageUrl,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        })
    }

    const imageUrl = image.path;

    const product = new Product({
        title: title,
        price: price,
        imageUrl: imageUrl,
        description: description
    });
    product
    .save()
    .then(result => {
        console.log('Product Created!');
        res.redirect('/admin/products');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if(!editMode){
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then(product => {
        if(!product){
            return res.redirect('/');
        }
        res.render('/admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: editMode,
            product: product,
            hasError: false,
            errorMessage: null,
            validationErrors: []
            //isAuthenticated: req.session.isLoggedIn
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedprice = req.body.price;
    //const updatedImageUrl = req.body.imageUrl;
    const image = req.file;
    const updatedDescription = req.body.description;
    
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: true,
            hasError: true,
            product: {
                title: updatedTitle,
                //imageUrl: updatedImageUrl,
                price: updatedPrice,
                description: updatedDescription,
                _id: prodId
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }
    
    Product.findById(prodId)
    .then(product => {
        if(product.userId.toString() !== req.user._id.toString()){
            req.flash('error', 'You cannot edit this product.')
            res.redirect('/');
        }
        product.title = updatedTitle;
        product.price = updatedPrice;
        //product.imageUrl = updateImageUrl;
        product.description = updateDescription;

        if(image) {
            //if user updates the image as well
            //delete the old image first
            fileHelper.deleteFile(product.imageUrl);
            //write the new image file path
            product.imageUrl = image.path;
        }
        return product.save()
        .then(result => {
            console.log('Product Updated!');
            res.redirect('/admin/products');
        })
    })
    .catch(err => {
        //console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        next(error);
    });
};


/*

exports.postDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    // Product.deleteOne({ _id: prodId, userId: req.user._id })
    // .then(() => {
    //     console.log('Product Deleted!');
    //     res.redirect('/admin/products');
    // })
    // .catch(err => {
    //     console.log(err);
    // });

    Product.findById(prodId)
    .then(product => {
        if(!product){
            return next(new Error('Product not found.'));
        }
        fileHelper.deleteFile(product.imageUrl);
        return Product.deleteOne({_id: produId, userID: req.user_id});
    })
    .then(() => {
        console.log('Product Deleted!');
        res.redirect('/admin/products');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

*/
//any route to be accessed by admin 
//check login status before accessing routes.


//asynchronously deleting a product.
//no need to refresh the page.
exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then(product => {
        if(!product){
            return next(new Error('Product not found.'));
        }
        fileHelper.deleteFile(product.imageUrl);
        return Product.deleteOne({_id: prodId, userID: req.user_id});
    })
    .then(() => {
        console.log('Product Deleted!');
        res.status(200).json({message: "Product Deletion Successful"});
    })
    .catch(err => {
        res.status(500).json({message: "Product Deletion Failed."})
    });
};