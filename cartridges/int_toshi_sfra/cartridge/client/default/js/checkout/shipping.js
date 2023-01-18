'use strict';

var base = require('base/checkout/shipping');
var addressHelpers = require('base/checkout/address');

var markToshiInputChecked = true;
var toshiTimeSelected = false;

/**
 * Update the shipping UI for a single shipping info (shipment model)
 * @param {Object} shipping - the shipping (shipment model) model
 * @param {Object} order - the order/basket model
 * @param {Object} customer - the customer model
 * @param {Object} [options] - options for updating PLI summary info
 * @param {Object} [options.keepOpen] - if true, prevent changing PLI view mode to 'view'
 */
 function updateShippingInformation(shipping, order, customer, options) {
    // First copy over shipmentUUIDs from response, to each PLI form
    order.shipping.forEach(function(aShipping) {
        aShipping.productLineItems.items.forEach(function(productLineItem) {
            base.methods.updateProductLineItemShipmentUUIDs(productLineItem, aShipping);
        });
    });

    // Now update shipping information, based on those associations
    updateShippingMethods(shipping);
    base.methods.updateShippingAddressFormValues(shipping);
    base.methods.updateShippingSummaryInformation(shipping, order);

    // And update the PLI-based summary information as well
    shipping.productLineItems.items.forEach(function(productLineItem) {
        base.methods.updateShippingAddressSelector(productLineItem, shipping, order, customer);
        base.methods.updatePLIShippingSummaryInformation(productLineItem, shipping, order, options);
    });

    $('body').trigger('shipping:updateShippingInformation', {
        order: order,
        shipping: shipping,
        customer: customer,
        options: options
    });
}

/**
 * Does Ajax call to select shipping method
 * @param {string} url - string representation of endpoint URL
 * @param {Object} urlParams - url params
 * @param {Object} el - element that triggered this call
 */
function selectShippingMethodAjax(url, urlParams, el) {
    markToshiInputChecked = false;
    $.spinner().start();
    $('body').trigger('checkout:beforeShippingMethodSelected');
    $.ajax({
            url: url,
            type: 'post',
            dataType: 'json',
            data: urlParams
        })
        .done(function(data) {
            if (data.error) {
                window.location.href = data.redirectUrl;
            } else {
                $('body').trigger('checkout:updateCheckoutView', {
                    order: data.order,
                    customer: data.customer,
                    options: {
                        keepOpen: true
                    },
                    urlParams: urlParams
                });
                $('body').trigger('checkout:postUpdateCheckoutView', {
                    el: el
                });
            }
            $('body').trigger('checkout:shippingMethodSelected', data);
            initToshi(markToshiInputChecked);
            $.spinner().stop();
        })
        .fail(function() {
            $.spinner().stop();
        });
}

/**
 * updates the shipping method radio buttons within shipping forms
 * @param {Object} shipping - the shipping (shipment model) model
 */
function updateShippingMethods(shipping) {
    var uuidEl = $('input[value=' + shipping.UUID + ']');

    if (uuidEl && uuidEl.length > 0) {
        $.each(uuidEl, function(shipmentIndex, el) {
            var form = el.form;
            if (!form) return;

            var $shippingMethodList = $('.shipping-method-list', form);

            if ($shippingMethodList && $shippingMethodList.length > 0) {
                $shippingMethodList.empty();
                var shippingMethods = shipping.applicableShippingMethods;
                var selected = shipping.selectedShippingMethod || {};
                var shippingMethodFormID = form.name + '_shippingAddress_shippingMethodID';
                //
                // Create the new rows for each shipping method
                //
                $.each(shippingMethods, function(methodIndex, shippingMethod) {
                    var tmpl = $('#shipping-method-template').clone();
                    // set input
                    $('input', tmpl)
                        .prop('id', 'shippingMethod-' + shippingMethod.ID + '-' + shipping.UUID)
                        .prop('name', shippingMethodFormID)
                        .prop('value', shippingMethod.ID)
                        .attr('checked', shippingMethod.ID === selected.ID)
                        .attr('data-istoshi', !!shippingMethod.toshiAvailabilityCheck)
                        .attr('data-toshikey', shippingMethod.toshiKey)
                        .attr('data-toshi-type', shippingMethod.toshiAvailabilityCheck);

                    $('label', tmpl)
                        .prop('for', 'shippingMethod-' + shippingMethod.ID + '-' + shipping.UUID);
                    // set shipping method name
                    $('.display-name', tmpl).text(shippingMethod.displayName);
                    // set or hide arrival time
                    if (shippingMethod.estimatedArrivalTime) {
                        $('.arrival-time', tmpl)
                            .text('(' + shippingMethod.estimatedArrivalTime + ')')
                            .show();
                    }
                    // set shipping cost
                    $('.shipping-cost', tmpl).text(shippingMethod.shippingCost);

                    if (!!shippingMethod.toshiAvailabilityCheck) {
                        $('#shipping-method-model', tmpl).addClass('shipping-method-toshi');
                    }

                    $shippingMethodList.append(tmpl.html());
                });
            }
        });
    }

    $('body').trigger('shipping:updateShippingMethods', {
        shipping: shipping
    });
}

/**
 * Update list of available shipping methods whenever user modifies shipping address details.
 * @param {jQuery} $shippingForm - current shipping form
 */
function updateShippingMethodList($shippingForm) {
    // delay for autocomplete!
    setTimeout(function() {
        var $shippingMethodList = $shippingForm.find('.shipping-method-list');
        var urlParams = addressHelpers.methods.getAddressFieldsFromUI($shippingForm);
        var shipmentUUID = $shippingForm.find('[name=shipmentUUID]').val();
        var url = $shippingMethodList.data('actionUrl');

        markToshiInputChecked = true;
        urlParams.shipmentUUID = shipmentUUID;

        $shippingMethodList.spinner().start();
        $.ajax({
            url: url,
            type: 'post',
            dataType: 'json',
            data: urlParams,
            success: function(data) {
                if (data.error) {
                    window.location.href = data.redirectUrl;
                } else {
                    $('body').trigger('checkout:updateCheckoutView', {
                        order: data.order,
                        customer: data.customer,
                        options: {
                            keepOpen: true
                        }
                    });

                    if (data.products.length > 0 && data.currentBasketUUID) {
                        window.toshiClient.products = data.products;
                        window.toshiClient.checkoutID = data.currentBasketUUID;
                    }

                    initToshi(markToshiInputChecked);
                    $shippingMethodList.spinner().stop();
                }
            }
        });
    }, 300);
}

function initToshi(selectToshiMethod) {
    var $form = $('.shipping-form');
    var toshiMethods = $(".shipping-method-block").find(`[data-istoshi='true'][data-toshikey]`);
    if (toshiMethods.length > 0) {
        var method = $(toshiMethods[0]);
        var key = method.data('toshikey');
        var mode = method.data('toshi-type');
        const modal = window.toshi.createBookingIntegration({
            api: {
                url: toshiClient.toshiModalUrl,
                key: key
            },
            ui: {
                mode: mode
            }
        });

        // This is fired by the ecommerce integration when the customer attempts to
        // proceed without selecting a timeslot.
        window.showErrorMessage = () => {
            modal.setInlineErrorMessage(
                toshiClient.errorMsg
            );
        };
        window.hideErrorMessage = () => {
            modal.setInlineErrorMessage(undefined);
        };

        modal.setFirstName($form.find('input[name$="_firstName"]').val());
        modal.setLastName($form.find('input[name$="_lastName"]').val());
        modal.setPhone($form.find('input[name$="_phone"]').val());
        $form.find('input[name$="_phone"]').change(function(e) {
            modal.setPhone($form.find('input[name$="_phone"]').val());
        });
        modal.setEmail($('.customer-summary').find('.customer-summary-email').html());
        modal.setAddress({
            addressLine1: $form.find('input[name$="_address1"]').val(),
            addressLine2: $form.find('input[name$="_address2"]').val(),
            town: $form.find('input[name$="_city"]').val(),
            province: $form.find('select[id$="shippingCountrydefault"]').val(),
            postcode: $form.find('input[name$="_postalCode"]').val(),
            country: $form.find('select[id$="shippingCountrydefault"]').val()
        });

        modal.setProducts(window.toshiClient.products);
        modal.setBrandCheckoutReference(window.toshiClient.checkoutID);

        modal.mount($('.shipping-method-toshi')[0]);
        modal.onOrderCreated(function(e) {
            if (!toshiTimeSelected) {
                selectToshiMethod = true;
            }

            if(!$('.shipping-method-toshi').hasClass('toshiTimeSelected')) {
                $('.shipping-method-toshi').addClass('toshiTimeSelected');
                toshiTimeSelected = true;
            }

            if (selectToshiMethod) {
                method.prop("checked", true).attr('checked', 'checked');
                method.trigger('change');
            }
        });
    }
}

base.onWindowLoad = function() {
    $(window).on('load', function() {
        if ($('.shipping-form').length > 0 && $('.shipping-method-toshi').length > 0 && !$('.payment-form').length > 0) {
            initToshi(markToshiInputChecked);
        }
    });
};

base.updateShippingList = function() {
    var baseObj = this;

    $('select[name$="shippingAddress_addressFields_states_stateCode"], input[name$="shippingAddress_addressFields_states_stateCode"], input[name$="_addressFields_address1"], input[name$="_addressFields_address2"], input[name$="_addressFields_city"], input[name$="_addressFields_postalCode"]')
        .on('change', function(e) {
            if (baseObj.methods && baseObj.methods.updateShippingMethodList) {
                baseObj.methods.updateShippingMethodList($(e.currentTarget.form));
            } else {
                updateShippingMethodList($(e.currentTarget.form));
            }
        });
};

base.methods.updateShippingMethods = updateShippingMethods;
base.methods.updateShippingMethodList = updateShippingMethodList;
base.methods.updateShippingInformation = updateShippingInformation;
base.methods.selectShippingMethodAjax = selectShippingMethodAjax;
base.methods.initToshi = initToshi;

module.exports = base;
