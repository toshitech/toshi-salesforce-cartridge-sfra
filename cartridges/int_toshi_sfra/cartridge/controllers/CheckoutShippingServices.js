'use strict';

var server = require('server');
server.extend(module.superModule);

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var toshiHelpers = require('*/cartridge/scripts/toshi/toshiHelpers');

server.append('UpdateShippingMethodsList', server.middleware.https, function(req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var data = res.getViewData();

    data.products = toshiHelpers.getLineItemCntrContent(currentBasket, true);
    data.currentBasketUUID = currentBasket.getUUID();
    res.setViewData(data);
    return next();
});


server.append(
    'SubmitShipping',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var BasketMgr = require('dw/order/BasketMgr');
        var Transaction = require('dw/system/Transaction');
        var currentBasket = BasketMgr.getCurrentBasket();
        var currentSite = require('dw/system/Site').getCurrent();
        var toshiTimeOut = currentSite.getCustomPreferenceValue('toshiBasketTimeout');

        var currentDate = new Date().valueOf();
        var expirationDate = currentDate + 60 * 1000 * toshiTimeOut;

        if (currentBasket.defaultShipment.shippingMethod && currentBasket.defaultShipment.shippingMethod.custom.toshiMethod.value) {
            Transaction.wrap(function() {
                currentBasket.custom.toshiExpiration = expirationDate;
            });
        }

        var isTryBeforeYouBuy = toshiHelpers.isTryBeforeYouBuy(currentBasket);

        if (isTryBeforeYouBuy) {
            var shippingAddress = currentBasket.defaultShipment.shippingAddress;

            Transaction.wrap(function () {
                var iter = currentBasket.getPaymentInstruments('Toshi').iterator();

                // Remove payment instruments.
                while (iter.hasNext()) {
                    currentBasket.removePaymentInstrument(iter.next());
                }

                var paymentInstrument = currentBasket.createPaymentInstrument('Toshi', currentBasket.getTotalGrossPrice());
            });
        } else {
            Transaction.wrap(function () {
                var iter = currentBasket.getPaymentInstruments('Toshi').iterator();

                // Remove payment instruments.
                while (iter.hasNext()) {
                    currentBasket.removePaymentInstrument(iter.next());
                }
            });
        }

        res.json({
            isTryBeforeBuy: isTryBeforeYouBuy
        });

        return next();
    }
);

module.exports = server.exports();
