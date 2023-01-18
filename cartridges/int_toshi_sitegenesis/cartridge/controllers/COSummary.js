/**
* Description of the Controller and the logic it provides
*
* @module  controllers/COSummary
*/

'use strict';

var base = module.superModule;
var guard = require('*/cartridge/scripts/guard');


function submit(){
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var BasketMgr = require('dw/order/BasketMgr');
    var currentSite = require('dw/system/Site').getCurrent();
    var toshiTimeOut = currentSite.getCustomPreferenceValue('toshiBasketTimeout');
    var currentDate = new Date().valueOf();
    
    var currentBasket = BasketMgr.getCurrentBasket();
    var isToshiOrder = false;
    if (currentBasket.defaultShipment.shippingMethod && currentBasket.defaultShipment.shippingMethod.custom.toshiMethod.value){
        isToshiOrder = true;    
    }
    if (isToshiOrder && currentBasket.custom.toshiExpiration < currentDate){
        response.redirect(URLUtils.https('COShipping-Start'));
    } else {
        return base.Submit.call(base);
    }
}

module.exports = Object.create(base, {
    Submit: {
        value: guard.ensure(['https', 'post', 'csrf'], submit)
    }   
});