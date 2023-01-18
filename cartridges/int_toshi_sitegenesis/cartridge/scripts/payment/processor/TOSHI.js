var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var toshiHelpers = require('*/cartridge/scripts/toshi/toshiHelpers');

function Authorize(args) {
    var orderNo = args.OrderNo;
    var order = args.Order;
    var authorizedVal = false;

    if (toshiHelpers.isTryBeforeYouBuy(order)) {
        var paymentInstrument = args.PaymentInstrument;
        var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    
        Transaction.wrap(function () {
            paymentInstrument.paymentTransaction.transactionID = orderNo;
            paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
        });
        authorizedVal = true;
    }

    return {authorized: authorizedVal};
}


exports.Authorize = Authorize;