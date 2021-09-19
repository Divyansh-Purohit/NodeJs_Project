const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/*
orders = 
    products:[
        
        { product: {  }, quantity: },
        { product: {  }, quantity: },
        { product: {  }, quantity: },
        ...
        ...
        ...
    ],
    user: {
        name:  , userId:   , <ref to User Model>
    }
 */
const orderSchema = new Schema({
    products: [
        {
            product: {
                type: Object,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ],
    user: {
        name: {
            type: String,
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    }
});

module.exports = mongoose.model('Order', orderSchema);