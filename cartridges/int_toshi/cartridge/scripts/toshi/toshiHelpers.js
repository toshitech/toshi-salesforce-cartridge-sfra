'use strict';

const ToshiService = 'toshi.api';
const TryBeforeYouBuy = 'tbyb_checkout';

var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger').getLogger('Toshi');
var URLUtils = require('dw/web/URLUtils');
var Money = require('dw/value/Money');
var HashMap = require('dw/util/HashMap');
var TaxMgr = require('dw/order/TaxMgr');

var toshiServiceClient = require('*/cartridge/scripts/toshi/toshiService');
var toshiAvailabilityCheck = require('*/cartridge/scripts/toshi/toshiAvailabilityCheck');
var sendNotificationEmail = require('*/cartridge/scripts/toshi/sendNotificationEmail');

exports.checkAddressEligible = function(address) {
    var eligible = false;

    try {
        var country = address.countryCode.value ? address.countryCode.value.toLowerCase() : address.countryCode ? address.countryCode.toLowerCase() : '';
        var toshiConfig = Site.getCurrent().getCustomPreferenceValue('toshiKey');

        if (toshiConfig) {
            var toshiKey = JSON.parse(toshiConfig);

            if (country in toshiKey) {
                let apiKey = toshiKey[country]['server'];
                var toshiService = toshiServiceClient('toshi.api.eligible');
                var requestParams = {
                    "address_line_1": address.address1,
                    "address_line_2": address.address2,
                    "town": address.city,
                    "postcode": address.postalCode,
                    "country": address.countryCode.value ? address.countryCode.value : address.countryCode
                }
                var result = toshiService.call({
                    request: requestParams,
                    apiKey: apiKey
                });

                if (result.status != 'OK' && !result.ok) {
                    sendNotificationEmail.sendNotification(result);
                }

                if (result && result.object) {
                    eligible = result.object.eligible;
                }

                if (eligible) {
                    session.privacy.toshiKey = toshiKey[country]['client'];
                }
            }
        }
    } catch (e) {
        Logger.error('Error checking address eligibility - {0}', e);
    }

    return eligible;
}

function sendOrder(order) {
    var orderSent = false;
    var isTry = isTryBeforeYouBuy(order);
    var shippingCountry = order.defaultShipment.shippingAddress.countryCode.value;
    var requestObject = {
        "customer": {
            "first_name": order.defaultShipment.shippingAddress.firstName,
            "surname": order.defaultShipment.shippingAddress.lastName,
            "email": order.customerEmail,
            "phone": order.defaultShipment.shippingAddress.phone,
            "customer_brand_reference": order.customerNo
        },
        "billing_address": {
            "address_line_1": order.billingAddress.address1,
            "address_line_2": order.billingAddress.address2,
            "town": order.billingAddress.city,
            "province": order.billingAddress.stateCode,
            "postcode": order.billingAddress.postalCode,
            "country": order.billingAddress.countryCode.value
        },
        "shipping_address": {
            "address_line_1": order.defaultShipment.shippingAddress.address1,
            "address_line_2": order.defaultShipment.shippingAddress.address2,
            "town": order.defaultShipment.shippingAddress.city,
            "province": order.defaultShipment.shippingAddress.stateCode,
            "postcode": order.defaultShipment.shippingAddress.postalCode,
            "country": shippingCountry
        },
        "basket_total": order.totalGrossPrice.value,
        "currency": order.currencyCode,
        "financial_status": isTry ? "partially_paid" : "paid",
        "amount_due": isTry ? order.totalGrossPrice.value : 0,
        "gift": order.defaultShipment.gift,
        "brand_checkout_reference": order.custom.toshiCheckoutID,
        "brand_order_reference": order.orderNo,
        "payment_provider": getPaymentInstruments(order)
    };

    requestObject.line_items = getLineItemCntrContent(order, false);
    var country = shippingCountry.toLowerCase();
    var toshiConfig = Site.getCurrent().getCustomPreferenceValue('toshiKey');

    if (toshiConfig) {
        var toshiKey = JSON.parse(toshiConfig);

        if (country in toshiKey) {
            let apiKey = toshiKey[country]['server'];
            var toshiService = toshiServiceClient('toshi.api.createorder');
            var result = toshiService.call({
                request: requestObject,
                apiKey: apiKey
            });

            if (result.status != 'OK' && !result.ok) {
                sendNotificationEmail.sendNotification(result);
            }
            if (result && result.object && result.object.status === 'ok') {
                orderSent = true;
            }
        }
    }
    return orderSent;
}

function getPaymentInstruments(order){
	var instruments = order.getPaymentInstruments();
	var result = [];

	for each (var instrument in instruments){
		result.push(instrument.paymentMethod);
	}

	return result.join();
}

function getLineItemCntrContent(lineItemCntr, showOtherVariants) {
    var noSizeLabel = Site.getCurrent().getCustomPreferenceValue('toshiNoSize');
    var returnObject = [];
    var products = lineItemCntr.getProductLineItems();

    for each(var productLineItem in products) {
        let productModel = getProductModel(productLineItem, noSizeLabel, showOtherVariants);
        returnObject.push(productModel);
    }

    return returnObject;
}

function getProductModel(lineitem, noSizeLabel, showOtherVariants) {
    var product = lineitem.product;
    var colour = '';
    var size = noSizeLabel;

    if (product.variant && product.variationModel.getProductVariationAttribute('color')) {
        colour = product.variationModel.getSelectedValue(product.variationModel.getProductVariationAttribute('color')).displayValue;
    }

    if (product.variant && product.variationModel.getProductVariationAttribute('size')) {
        size = product.variationModel.getSelectedValue(product.variationModel.getProductVariationAttribute('size')).displayValue;
    }

    var categoryProduct = product.variant ? product.masterProduct : product;
    var markdownPrice = lineitem.adjustedPrice.divide(lineitem.quantityValue).value;

    if (TaxMgr.taxationPolicy === TaxMgr.TAX_POLICY_NET) {
        markdownPrice = round_number((parseFloat(markdownPrice) + parseFloat((parseFloat(lineitem.adjustedTax.value) / lineitem.quantityValue))), 6);
    }

    var stdPrice = getStdPrice(product.priceModel);
    var availabilityType = getAvailabilityType(lineitem);
    var productJSON = {
        name: product.name,
        quantity: lineitem.quantityValue,
        productCategory: getCategory(categoryProduct),
        sku: product.variant ? product.masterProduct.ID : product.ID,
        variantSku: product.ID,
        retailPrice: stdPrice === Money.NOT_AVAILABLE ? product.priceModel.getPrice().value : stdPrice.value,
        promotionPrice: markdownPrice.value,
        promotionID: getPromotions(lineitem),
        markdownPrice: markdownPrice,
        finalPrice: markdownPrice,
        availabilityType: availabilityType,
        availabilityDate: availabilityType === 'Fixed' ? product.availabilityModel.inventoryRecord.inStockDate : null,
        imageUrl: product.getImage('medium', 0).getHttpsURL().toString(),
        productUrl: URLUtils.url('Product-Show', 'pid', product.ID).abs().toString(),
        colour: colour,
        size: size,
        description: empty(product.shortDescription.markup) ? '' : product.shortDescription.markup.replace(/<[^>]*>?/gm, '')
    };

    if (showOtherVariants) {
        productJSON.availableSizes = getAvailableSizes(product);
    }

    return productJSON;
}

/**
 * Used for specifying MAX number of digits after the fp
 */
function round_number(num, dec) {
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

function getStdPrice(priceModel) {
    var standardPrice = Money.NOT_AVAILABLE;

    if (!empty(priceModel)) {
        if (!priceModel.getPrice().available) {
            standardPrice = Money.NOT_AVAILABLE;
        } else {
            var priceBook = priceModel.priceInfo.priceBook;

            while (priceBook.parentPriceBook) {
                priceBook = priceBook.parentPriceBook ? priceBook.parentPriceBook : priceBook;
            }
            standardPrice = priceModel.getPriceBookPrice(priceBook.ID);
        }
    }

    return standardPrice;
}

function getCategory(product) {
    var result = '';

    if (product.classificationCategory) {
        result = product.classificationCategory.ID;
    } else if (product.primaryCategory) {
        result = product.primaryCategory.ID;
    } else {
        if (product.categoryAssignments.length > 0) {
            result = product.categoryAssignments[0].category.ID;
        }
    }

    return result;
}

function getPromotions(lineitem) {
    var results = [];
    var adjustments = lineitem.priceAdjustments;

    if (adjustments.length > 0) {
        for each(var adjustment in adjustments) {
            results.push(adjustment.promotionID);
        }
    }

    return results.join();
}

function getAvailableSizes(product) {
    var availableSizes = [];
    var filter = new HashMap;

    if (product.variant) {
        let masterProduct = product.master;
        let pvm = product.variationModel;
        let sizeAttribute = pvm.getProductVariationAttribute('size');

        if (sizeAttribute)
            var sizes = pvm.getFilteredValues(sizeAttribute);

        for each(var size in sizes) {
            filter.put(sizeAttribute.ID, size.ID);
            var availableProducts = pvm.getVariants(filter);

            if (availableProducts.length > 0) {
                var availableProduct = availableProducts[0];
                var availableProduct = {
                    variantSku: availableProduct.ID,
                    size: size.displayValue,
                    isAvailable: availableProduct.availabilityModel.inStock ? true : false
                }

                availableSizes.push(availableProduct);
            }
        }
    }

    return availableSizes;
}

function getAvailabilityType(productLineItem) {
    var ProductAvailabilityModel = require('dw/catalog/ProductAvailabilityModel');

    var availabilityType = 'Unknown';

    if (!productLineItem || !productLineItem.product) {
        return availabilityType;
    }

    var productAvailabilityModel = productLineItem.product.availabilityModel;

    if (!productAvailabilityModel) {
        return availabilityType;
    }

    var availabilityStatus = productAvailabilityModel.availabilityStatus;
    var inventoryRecord = productAvailabilityModel.inventoryRecord;

    if (availabilityStatus == ProductAvailabilityModel.AVAILABILITY_STATUS_IN_STOCK && inventoryRecord != null && (inventoryRecord.stockLevel.available || inventoryRecord.perpetual)) {
        availabilityType = 'Immediate';
    } else if (availabilityStatus === ProductAvailabilityModel.AVAILABILITY_STATUS_PREORDER && inventoryRecord.inStockDate > new Date()) {
        availabilityType = 'Fixed';
    }

    return availabilityType;
}

function isTryBeforeYouBuy(lineItemCntr){
	var result = false;

    if (lineItemCntr.defaultShipment.shippingMethod && lineItemCntr.defaultShipment.shippingMethod.custom.toshiMethod.value === TryBeforeYouBuy){
        result = true;
    }

    return result;
}

exports.getLineItemCntrContent = getLineItemCntrContent;
exports.isTryBeforeYouBuy = isTryBeforeYouBuy;
exports.sendOrder = sendOrder;
