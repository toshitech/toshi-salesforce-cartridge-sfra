'use strict';

const base = require('base/checkout/billing');

/**
 * Updates the payment information in checkout, based on the supplied order model
 * @param {Object} order - checkout model to use as basis of new truth
 */
function updatePaymentInformation(order) {
    // update payment details
    var $paymentSummary = $('.payment-details');
    var htmlToAppend = '';

    if (order.billing.payment && order.billing.payment.selectedPaymentInstruments.length > 0 && order.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'Toshi') {
        htmlToAppend += '<span>'
            + order.billing.payment.selectedPaymentInstruments[0].paymentMethod
            + '</span></div>'
            + '</div><div><span>'
            + 'Amount: $'
            + order.billing.payment.selectedPaymentInstruments[0].amount
            + '</span></div>';
    } else if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0) {
        htmlToAppend += '<span>' + order.resources.cardType + ' '
            + order.billing.payment.selectedPaymentInstruments[0].type
            + '</span><div>'
            + order.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber
            + '</div><div><span>'
            + order.resources.cardEnding + ' '
            + order.billing.payment.selectedPaymentInstruments[0].expirationMonth
            + '/' + order.billing.payment.selectedPaymentInstruments[0].expirationYear
            + '</span></div>';
    }

    $paymentSummary.empty().append(htmlToAppend);
}

base.methods.updatePaymentInformation = updatePaymentInformation;

module.exports = base;
