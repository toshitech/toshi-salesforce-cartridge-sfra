'use strict';

var base = module.superModule;
var ShippingMgr = require('dw/order/ShippingMgr');
var ArrayList = require('dw/util/ArrayList');
var method;

/**
 * Extends CartModel methods
 * @returns {CartModel} - CartModel object
 */
function cartModelExtend() {
    var cartModel = base[method].apply(base, Array.prototype.slice.call(arguments));
    if (!cartModel) {
        return cartModel;
    }
    cartModel = Object.create(cartModel, {
        super: {
            enumerable: true,
            value: cartModel
        },
        /**
         * Overrides getApplicableShippingMethods method in superModule
         * @returns {dw.util.Collection} - new Collection of applicable shipping methods
         */
        getApplicableShippingMethods: {
            value: function (address) {
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
                var toshiMeetAmount = true;
                // Modify as needed.
                if (!address.countryCode) {
                    address.countryCode = 'US';
                }
                if (!address.stateCode) {
                    address.stateCode = 'NY';
                }
                var basket = this.object;
                var basketAmount = basket.getAdjustedMerchandizeTotalGrossPrice();
                var currencyCode = basket.currencyCode;
                var minimalToshiAmount = 0;
                if (minimalToshiAmountJSON){
                    var amounts = JSON.parse(minimalToshiAmountJSON);
                    minimalToshiAmount = amounts[currencyCode];
                    if (minimalToshiAmount && minimalToshiAmount > basketAmount.value){
                        toshiMeetAmount = false;
                    }
                }

                // Retrieves the list of applicable shipping methods for the given shipment and address.
                var applicableShippingMethods = ShippingMgr.getShipmentShippingModel(this.getDefaultShipment()).getApplicableShippingMethods(address);
                for (var i = 0; i < applicableShippingMethods.length; i++) {
                  let shippingMethod = applicableShippingMethods[i];
                  if (shippingMethod.custom.toshiMethod && shippingMethod.custom.toshiMethod.value){
                      if (toshiEnabled && !addressChecked && !empty(address.postalCode)){
                        toshiEligible = toshiHelpers.checkAddressEligible(address);
                        addressChecked = true;
                      }
                      var productsAvailable = toshiAvailabilityCheck.checkCartAvailability(address, basket);
                      if (toshiEligible && toshiMeetAmount && productsAvailable.productsAvailable){
                          resultMethods.add(shippingMethod);
                          toshiMethods.add(shippingMethod);
                      }
                  } else {
                    resultMethods.add(shippingMethod);
                  }
                }
                if (toshiEligible && showOnlyToshi){
                    return toshiMethods;
                } else {
                    return resultMethods;
                }
            }
        },
        createOrder: { 
            value : function () {
                var Transaction = require('dw/system/Transaction');
                var OrderMgr = require('dw/order/OrderMgr');
                var toshiAvailabilityCheck = require('*/cartridge/scripts/toshi/toshiAvailabilityCheck');
                var toshiStoreID = '';
                var basket = this.object;
                var checkoutID = basket.getUUID();
                var order;
                var isToshiOrder = false;
                if (basket.defaultShipment.shippingMethod && basket.defaultShipment.shippingMethod.custom.toshiMethod.value){
                    isToshiOrder = true;
                    let store = toshiAvailabilityCheck.getToshiStore(basket.defaultShipment.shippingAddress);
                    if (store){
                        toshiStoreID = store.ID;
                    }
                }
                try {
                    order = Transaction.wrap(function () {
                        var order =  OrderMgr.createOrder(basket);
                        if (isToshiOrder){
                            order.custom.toshiCheckoutID = checkoutID;
                            order.custom.sendToToshi = 1;
                            order.custom.toshiStoreID = toshiStoreID;
                        }
                        return order;
                    });
                } catch (error) {
                	var q = error;

                    return;
                }
                return order;
            }
        }    
    
    });
    return cartModel;
}

module.exports = {
    get: function () {
        method = 'get';
        return cartModelExtend.apply(cartModelExtend, Array.prototype.slice.call(arguments));
    },
    goc: function () {
        method = 'goc';
        return cartModelExtend.apply(cartModelExtend, Array.prototype.slice.call(arguments));
    }
};
