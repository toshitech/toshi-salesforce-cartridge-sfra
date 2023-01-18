/**
* Description of the Controller and the logic it provides
*
* @module  controllers/COShipping
*/

'use strict';

var base = module.superModule;
var guard = require('*/cartridge/scripts/guard');
var app = require('*/cartridge/scripts/app');



function singleShipping(){
    var Transaction = require('dw/system/Transaction');
    var BasketMgr = require('dw/order/BasketMgr');
    var currentSite = require('dw/system/Site').getCurrent();
    var toshiTimeOut = currentSite.getCustomPreferenceValue('toshiBasketTimeout');
    var currentDate = new Date().valueOf();
    var expirationDate = currentDate + 60 * 1000 * toshiTimeOut;
    var currentBasket = BasketMgr.getCurrentBasket();
    Transaction.wrap(function(){
        currentBasket.custom.toshiExpiration = expirationDate;
        currentBasket.setCustomerEmail(app.getForm('singleshipping').object.shippingAddress.email.emailAddress.value);
    });
    return base.SingleShipping.call(base);
}

module.exports = Object.create(base, {
    SingleShipping: {
        value: guard.ensure(['https', 'post', 'csrf'], singleShipping)
    }   
});