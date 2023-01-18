'use strict';

var server = require('server');
server.extend(module.superModule);

server.prepend('PlaceOrder', server.middleware.https, function(req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var currentDate = new Date().valueOf();

    var isToshiOrder = false;

    if (currentBasket.defaultShipment.shippingMethod && currentBasket.defaultShipment.shippingMethod.custom.toshiMethod.value) {
        isToshiOrder = true;
    }

    if (isToshiOrder && currentBasket.custom.toshiExpiration < currentDate) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'shipping').toString()
        });

        this.emit('route:Complete', req, res);
        return;
    } else {
        return next();
    }
});

module.exports = server.exports();
