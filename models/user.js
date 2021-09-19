const e = require('express');
const mongoose = require('mongoose');
const product = require('./product');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    //cart: {
    //    items: [
    //          {productId:   , quantity:   },
    //          {ProductId:    , quantity:  },
    //          {ProductId:    , quantity:  },
    //            ....}
    //           ]
    //      }
    resetToken: String,
    resetTokenExpiry: Date,
    cart: {
        items: [
            {
                productId:{
                    type: Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true
                }
            }
        ]
    }
});

//to add our own methods on models
//schemaName.methods.methodname = function() {....}

userSchema.methods.addToCart = function(product) {
    //to check whether the product already exists in the user's cart.
    const cartProductIndex = this.cart.items.findIndex(cp => {
        return cp.productId.toString() === product.productId.toString();
    });

    let newQuantity = 1;
    const updatedCartItems = [...this.cart.items];
    //updatedCartItems hold the items in the original cart.
    //because we don't want to mutate the original cart.

    if(cartProductIndex >= 0){
        //product already exists!
        newQuantity = this.cart.items[cartProductIndex].quantity + 1;
        updatedCartItems[cartProductIndex].quantity = newQuantity;
    }
    else{
    //Product is added to the cart for the first time!
        updatedCartItems.push({
            productId: product._id,
            quantity: 1
        });
    }

    // now the updatedCartItems object is in sync with the latest cart state.

    const updatedCart = {
        items: UpdatedCartItems
    };

    //updatedCart : {items: [{}, {}, ..]}
    //updatedCart has the same structure as our original Cart but is in the latest state

    this.cart = updatedCart;
    //assigning the Updatecart to the user's original cart
    return this.save();
    //first save/update the current user's new state to the database
    //only then return
};

userSchema.methods.removeFromCart = function(productId) {
    
    //finding and removing the product from the cart.
    //using filter method on the cart.items array.
    const UpdatedCartItems = this.cart.items.filter(cp => {
        return cp.productId.toString() === productId.toString();
    });

    //updating the user's cart
    this.cart.items = updatedCartItems;
    
    return this.save();
    //first save/update the current user's new state to the database
    //only then return
};

userSchema.methods.clearCart = function() {
    
    //clearing the user's cart.
    this.cart = {items: []};

    return this.save();
    //first save/update the current user's new state to the database
    //only then return
};

module.exports = mongoose.model('User', userSchema);
