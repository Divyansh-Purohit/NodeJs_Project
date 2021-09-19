const express = require('express');
const router = express.Router();

const shopController = require('../controllers/shop');
const isAuth = require('../middleware/is-auth');

// / (GET)
router.get('/', shopController.getIndex);

// /products (GET)
router.get('/products', shopController.getProducts);

// /product/12345 (GET)
router.get('/products/:productId', isAuth, shopController.getProduct);

// /cart (GET)
router.get('/cart', shopController.getCart);

// /cart (POST)
router.post('/cart', isAuth, shopController.postCart);

// /cart-delete-item (POST)
router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.get('/checkout', isAuth, shopController.getCheckout);

router.get('/checkout/success', shopController.getCheckoutSuccess);
//if payment is successful.

router.get('/checkout/cancel', shopController.getCheckout);
//incase payment fails.

// /create-order (POST)
router.post('/create-order', isAuth, shopController.postOrder);

// /orders (GET)
router.get('/orders', isAuth, shopController.getOrders);

// /orders/12345 (GET)
router.get('/orders/:orderId', isAuth, shopController.getInvoice);

module.exports = router;
