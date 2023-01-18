/**
* Description of the Controller and the logic it provides
*
* @module  controllers/COShipping
*/

'use strict';

var base = module.superModule;
var guard = require('*/cartridge/scripts/guard');
var app = require('*/cartridge/scripts/app');


function start(){
    var Transaction = require('dw/system/Transaction');
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var Cart = require('~/cartridge/scripts/models/CartModel');
    var cart = Cart.get(currentBasket);
    var toshiHelpers = require('*/cartridge/scripts/toshi/toshiHelpers');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var shippingAddress;
    if (toshiHelpers.isTryBeforeYouBuy(currentBasket)){
        var paymentMethod = PaymentMgr.getPaymentMethod('Toshi');
        shippingAddress = currentBasket.defaultShipment.shippingAddress;
        Transaction.wrap(function () {
            cart.removeExistingPaymentInstruments('Toshi');
            var paymentInstrument = cart.createPaymentInstrument('Toshi', cart.getNonGiftCertificateAmount());
        });
        var billingAddress = cart.getBillingAddress();
        Transaction.wrap(function () {

            if (!billingAddress) {
                billingAddress = cart.createBillingAddress();
            }
            billingAddress.firstName = shippingAddress.firstName;
            billingAddress.lastName = shippingAddress.lastName;
            billingAddress.address1  = shippingAddress.address1;
            billingAddress.address2  = shippingAddress.address2;
            billingAddress.countryCode = shippingAddress.countryCode;
            billingAddress.postalCode = shippingAddress.postalCode;
            billingAddress.stateCode = shippingAddress.stateCode;
            billingAddress.city = shippingAddress.city;
            
            cart.setCustomerEmail(app.getForm('singleshipping').object.shippingAddress.email.emailAddress.value);
        });
        app.getForm('billing').object.fulfilled.value = true;
        app.getController('COSummary').Start();
    } else {
        return base.Start.call(base);
    }
}

module.exports = Object.create(base, {
    Start: {
        value: guard.ensure(['https'], start)
    }   
});