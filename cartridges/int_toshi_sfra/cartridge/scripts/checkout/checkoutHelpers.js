'use strict';

var base = module.superModule;

var HookMgr = require('dw/system/HookMgr');
var OrderMgr = require('dw/order/OrderMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');
var Order = require('dw/order/Order');
var Transaction = require('dw/system/Transaction');

/**
 * handles the payment authorization for each payment instrument
 * @param {dw.order.Order} order - the order object
 * @param {string} orderNumber - The order number for the order
 * @returns {Object} an error object
 */
function handlePayments(order, orderNumber) {
    var result = {};

    if (order.totalNetPrice !== 0.00) {
        var paymentInstruments = order.paymentInstruments;
        var authorizationResult;

        if (paymentInstruments.length === 0) {
            Transaction.wrap(function() {
                OrderMgr.failOrder(order, true);
            });
            result.error = true;
        }

        if (!result.error) {
            for (var i = 0; i < paymentInstruments.length; i++) {
                var paymentInstrument = paymentInstruments[i];
                var paymentProcessor = PaymentMgr
                    .getPaymentMethod(paymentInstrument.paymentMethod)
                    .paymentProcessor;

                if (paymentInstrument.paymentMethod === 'Toshi') {
                    Transaction.begin();
                    paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                    paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
                    Transaction.commit();
                } else {
                    if (paymentProcessor === null) {
                        Transaction.begin();
                        paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                        Transaction.commit();
                    } else {
                        if (HookMgr.hasHook('app.payment.processor.' +
                                paymentProcessor.ID.toLowerCase())) {
                            authorizationResult = HookMgr.callHook(
                                'app.payment.processor.' + paymentProcessor.ID.toLowerCase(),
                                'Authorize',
                                orderNumber,
                                paymentInstrument,
                                paymentProcessor
                            );
                        } else {
                            authorizationResult = HookMgr.callHook(
                                'app.payment.processor.default',
                                'Authorize'
                            );
                        }

                        if (authorizationResult.error) {
                            Transaction.wrap(function() {
                                OrderMgr.failOrder(order, true);
                            });
                            result.error = true;
                            break;
                        }
                    }
                }
            }
        }
    }

    return result;
}


/**
 * Attempts to create an order from the current basket
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {dw.order.Order} The order object created from the current basket
 */
function createOrder(currentBasket) {
    var toshiAvailabilityCheck = require('*/cartridge/scripts/toshi/toshiAvailabilityCheck');
    var toshiStoreID = '';
    var checkoutID = currentBasket.getUUID();
    var isToshiOrder = false;
    var order;

    if (currentBasket.defaultShipment.shippingMethod && currentBasket.defaultShipment.shippingMethod.custom.toshiMethod.value) {
        isToshiOrder = true;
        let store = toshiAvailabilityCheck.getToshiStore(currentBasket.defaultShipment.shippingAddress);

        if (store) {
            toshiStoreID = store.ID;
        }
    }

    try {
        order = Transaction.wrap(function() {
            var order = OrderMgr.createOrder(currentBasket);

            if (isToshiOrder) {
                order.custom.toshiCheckoutID = checkoutID;
                order.custom.sendToToshi = 1;
                order.custom.toshiStoreID = toshiStoreID;
            }
            return order;
        });
    } catch (error) {
        return null;
    }

    return order;
}

module.exports = {
    handlePayments: handlePayments,
    createOrder: createOrder
};

Object.keys(base).forEach(function(prop) {
    if (!module.exports.hasOwnProperty(prop)) {
        module.exports[prop] = base[prop];
    }
});
