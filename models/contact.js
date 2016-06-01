var mongoose = require('mongoose');

var contactSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        validate: [function(value) {return; /* check db for existing user*/}, 'Contact is not registered with us']
    },
    status: {
        type: String,
        default: 'offline'
    },
    connection: {
        type: String,
        default: 'none'
    },
    confirmed: {
        type: Boolean,
        default: false
    }
    });

module.exports =mongoose.model('Contact', contactSchema);


