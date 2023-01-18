'use strict';

var server = require('server');
server.extend(module.superModule);

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var toshiHelpers = require('*/cartridge/scripts/toshi/toshiHelpers');
server.append(
    'Begin',
    server.middleware.https,
    consentTracking.consent,
    csrfProtection.generateToken,
    function(req, res, next) {
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentBasket();
        var data = res.getViewData();

        data.products = JSON.stringify(toshiHelpers.getLineItemCntrContent(currentBasket, true));
        data.currentBasketUUID = currentBasket.getUUID();
        res.setViewData(data);
        next();
    }
);

module.exports = server.exports();
