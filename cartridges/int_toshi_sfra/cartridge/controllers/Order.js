'use strict';

var server = require('server');
server.extend(module.superModule);

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

/**
 * Order-Confirm : This endpoint is invoked when the shopper's Order is Placed and Confirmed
 * @name Base/Order-Confirm
 * @function
 * @memberof Order
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken
 * @param {querystringparameter} - ID - Order ID
 * @param {querystringparameter} - token - token associated with the order
 * @param {category} - sensitive
 * @param {serverfunction} - get
 */
server.append(
    'Confirm',
    consentTracking.consent,
    server.middleware.https,
    csrfProtection.generateToken,
    function(req, res, next) {
        var OrderMgr = require('dw/order/OrderMgr');
        var Transaction = require('dw/system/Transaction');
        var toshiHelpers = require('*/cartridge/scripts/toshi/toshiHelpers');

        var order;

        order = OrderMgr.getOrder(req.form.orderID, req.form.orderToken);

        if (order) {
            if (order.custom.sendToToshi && order.custom.sendToToshi.value === 1) {
                var orderSentResult = toshiHelpers.sendOrder(order);

                if (orderSentResult) {
                    Transaction.wrap(function() {
                        order.custom.sendToToshi = 2;
                    });
                }
            }
        }

        return next();
    }
);

module.exports = server.exports();
