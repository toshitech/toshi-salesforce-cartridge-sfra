'use strict';

var base = module.superModule;

var collections = require('*/cartridge/scripts/util/collections');
var ShippingMgr = require('dw/order/ShippingMgr');
var ShippingModel = require('*/cartridge/models/shipping');
var ShippingMethodModel = require('*/cartridge/models/shipping/shippingMethod');
var Transaction = require('dw/system/Transaction');
var ArrayList = require('dw/util/ArrayList');

/**
 * Plain JS object that represents a DW Script API dw.order.ShippingMethod object
 * @param {dw.order.Shipment} shipment - the target Shipment
 * @param {Object} [address] - optional address object
 * @returns {dw.util.Collection} an array of ShippingModels
 */
function getApplicableShippingMethods(shipment, address) {
    if (!shipment) return null;
    var BasketMgr = require('dw/order/BasketMgr');
    var currentSite = require('dw/system/Site').getCurrent();
    var showOnlyToshi = currentSite.getCustomPreferenceValue('toshiDisableOtherShippingMethods');
    var minimalToshiAmountJSON = currentSite.getCustomPreferenceValue('toshiMinimalAmount');
    var toshiEnabled = currentSite.getCustomPreferenceValue('toshiEnabled');
    var toshiHelpers = require('*/cartridge/scripts/toshi/toshiHelpers');
    var toshiAvailabilityCheck = require('*/cartridge/scripts/toshi/toshiAvailabilityCheck');

    var toshiEligible = false;
    var addressChecked = false;
    var resultMethods = new ArrayList();
    var toshiMethods = new ArrayList();
    var applicableShippingMethods = new ArrayList();
    var toshiMeetAmount = true;

    var basket = BasketMgr.getCurrentBasket();
    var shipmentShippingModel = ShippingMgr.getShipmentShippingModel(shipment);

    if (basket) {
        var basketAmount = basket.getAdjustedMerchandizeTotalGrossPrice();
        var currencyCode = basket.currencyCode;

        if (minimalToshiAmountJSON) {
            var amounts = JSON.parse(minimalToshiAmountJSON);
            var minimalToshiAmount = amounts[currencyCode];

            if (minimalToshiAmount && minimalToshiAmount > basketAmount.value) {
                toshiMeetAmount = false;
            }
        }
    }

    // Retrieves the list of applicable shipping methods for the given shipment and address.
    if (address) {
        applicableShippingMethods = shipmentShippingModel.getApplicableShippingMethods(address);

    } else if (!address && !shipment.getShippingAddress()) {
        resultMethods = shipmentShippingModel.getApplicableShippingMethods();

    } else if (!address && shipment.getShippingAddress()) {
        address = getAddressFormShipment(shipment.getShippingAddress());

        if (!empty(address.postalCode)) {
            applicableShippingMethods = shipmentShippingModel.getApplicableShippingMethods(address);
        } else {
            resultMethods = shipmentShippingModel.getApplicableShippingMethods();
            session.privacy.toshiKey = '';
            address = null;
        }
    }

    if (address) {
        for (var i = 0; i < applicableShippingMethods.length; i++) {
            let shippingMethod = applicableShippingMethods[i];
            if (shippingMethod.custom.toshiMethod && shippingMethod.custom.toshiMethod.value) {
                if (toshiEnabled && !addressChecked && !empty(address.postalCode)) {
                    toshiEligible = toshiHelpers.checkAddressEligible(address);
                    addressChecked = true;
                }

                let productsAvailable = toshiAvailabilityCheck.checkCartAvailability(address, basket);
                if (toshiEligible && toshiMeetAmount && productsAvailable.productsAvailable) {
                    resultMethods.add(shippingMethod);
                    toshiMethods.add(shippingMethod);
                }
            } else {
                resultMethods.add(shippingMethod);
            }
        }
    }
    if (toshiEligible && showOnlyToshi) {
        // return toshiMethods;
        var toshiFilteredMethods = [];
        collections.forEach(toshiMethods, function(toshiMethod) {
            if (!toshiMethod.custom.storePickupEnabled) {
                toshiFilteredMethods.push(new ShippingMethodModel(toshiMethod, shipment));
            }
        });

        if (toshiFilteredMethods.length > 0) {
            toshiFilteredMethods[0].selected = true;
            session.privacy.isOnlyToshiMthod = true;
        }

        return toshiFilteredMethods;
    } else {
        var filteredMethods = [];
        collections.forEach(resultMethods, function(resultMethod) {
            if (!resultMethod.custom.storePickupEnabled) {
                filteredMethods.push(new ShippingMethodModel(resultMethod, shipment));
            }
        });
        return filteredMethods;
    }
}

function getAddressFormShipment(shipmentAddress) {
    return {
        address1: shipmentAddress.address1,
        address2: shipmentAddress.address2,
        city: shipmentAddress.city,
        stateCode: shipmentAddress.stateCode,
        postalCode: shipmentAddress.postalCode,
        countryCode: shipmentAddress.countryCode
    }
}

module.exports = {
    getApplicableShippingMethods: getApplicableShippingMethods
};
Object.keys(base).forEach(function(prop) {
    // eslint-disable-next-line no-prototype-builtins
    if (!module.exports.hasOwnProperty(prop)) {
        module.exports[prop] = base[prop];
    }
});
