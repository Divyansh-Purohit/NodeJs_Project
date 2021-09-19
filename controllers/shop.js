const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
//to work with .pdf files
//const stripe = require('stripe')('STRIPE_PRIVATE_KEY_HERE');
const stripe = require('stripe')(process.env.STRIPE_KEY);

const Product = require('../models/product');
const Order = require('../models/order');
const { page } = require('pdfkit');

const ITEMS_PER_PAGE = 2;
//for pagination

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    //default page = 1
    let totalItems;

    Product.find()
    .countDocuments()
    //mongoose method to count the number of the items in a collection
    .then(numProducts => {
        totalItems = numProducts;
        return Product.find()
            .skip((+page - 1) * ITEMS_PER_PAGE)
            //how many documents to skip
            //example if we are on 2nd page, we will skip the first 3 documents
            //3 items per page are present
            .limit(ITEMS_PER_PAGE);
            //we will return only the next 3 items
    })
    .then(products => {
        res.render('shop/index', {
            pageTitle:'Shop',
            prods: products,
            path:'/',
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        });        
    })
    .catch(err => {
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;
    Product.find()
    .countDocuments()
    .then(numProducts => {
        totalItems = numProducts;
        return Product.find()
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
        res.render('shop/product-list', {
            pageTitle: 'Products',
            path: '/products',
            prods: products,
            //isAuthenticated:req.session.isLoggedIn
            currentPage: page,
            hasPreviousPage: page > 1,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            previousPage: page -1,
            nextPage: page + 1,
            lastPage: Math.ceil(totalItems/ ITEMS_PER_PAGE)
            //last page may contain 1 or 2 items but not more than that.
        });
    })
    .catch(err => {
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then(product => {
        res.render('shop/product-detail', {
            pageTitle: product.title,
            product: product,
            path: '/products/prodId',
            //isAuthenticated:req.session.isLoggedIn
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getCart = (req, res, next) => {
    req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
        const products = user.cart.items;
        res.render('shop/cart', {
            pageTitle: 'Your Cart',
            path: '/cart',
            products: products,
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
    .then(product => {
        return req.user.addToCart(product);
    })
    .then(result => {
        console.log(result);
        res.redirect('/cart');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
    .removeFromCart(prodId)
    .then(result => {
        res.redirect('/cart')
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}

exports.getCheckout = (req, res, next) => {
    let products;
    let total = 0;
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            products = user.cart.items;
            total = 0;
            products.forEach(p => {
            total += p.quantity * p.productId.price;
            });
            return stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: products.map(p => {
                return {
                name: p.productId.title,
                description: p.productId.description,
                amount: p.productId.price * 100,
                currency: 'usd',
                quantity: p.quantity
                };
            }),
            success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:8000
            cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
        });
    })
    .then(session => {
        res.render('shop/checkout', {
          path: '/checkout',
          pageTitle: 'Checkout',
          products: products,
          totalSum: total,
          sessionId: session.id
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } };
        });
        const order = new Order({
            user: {
                email: req.user.email,
                userId: req.user
            },
            products: products
        });
        return order.save();
    })
    .then(result => {
        return req.user.clearCart();
     })
    .then(() => {
        res.redirect('/orders');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};


exports.postOrder = (req, res, next) => {
    req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
        const products = user.cart.items.map(pr => {
            return {
                quantity: pr.quantity, product: {...pr.productId._doc}
            };
        });
        const order = new Order({
            user: {
                name: req.user.name,
                userId: req.user
            },
            products: products
        });
        return order.save();
    })
    .then(result => {
        return req.user.clearCart();
    })
    .then(() => {
        res.redirect('/orders');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getOrders = (req, res, next) => {
    Order.find({'user.userId' : req.user._id})
    .then(orders => {
        res.render('shop/orders', {
            pageTitle: 'Your Orders',
            path:'/orders',
            orders: orders,
            //isAuthenticated: req.session.isLoggedIn
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.param.orderId;
    Order.findById(orderId)
    .then(order => {
        if(!order){
            return next(new Error('No order found.'));
        }
        if(order.user.userId.toString() !== req.user._id.toString()){
            return next(new Error('You are not authorized to view this order.'));
        }

        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join('data', 'invoice', invoiceName);

        const pdfDoc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="'+ invoiceName + '"');

        pdfDoc.pipe(fs.createReadStream(invoicePath));
        pdfDoc.pipe(res);

        pdfDoc.fontSize(24).text('Invoice', {
            underline: true
        });

        let totalPrice = 0;
        order.products.forEach(product => {
            totalPrice += product.quantity * product.product.price;
            pdfDoc
            .fontSize(14)
            .text(
            product.product.title + 
            ' - ' + 
            product.quantity +
            ' * ' + 
            '₹' +
            product.product.price 
            );
        });
        pdfDoc.text('---------');
        pdfDoc.fontSize(20).text('Total Price: ₹' + totalPrice);
        pdfDoc.end();
        // fs.readFile(invoicePath, (err, data) => {
        //   if (err) {
        //     return next(err);
        //   }
        //   res.setHeader('Content-Type', 'application/pdf');
        //   res.setHeader(
        //     'Content-Disposition',
        //     'inline; filename="' + invoiceName + '"'
        //   );
        //   res.send(data);
        // });
        // const file = fs.createReadStream(invoicePath);

        // file.pipe(res);
    })
    .catch(err => {
        next(err);
    });
};