/**
* Description of the Controller and the logic it provides
*
* @module  controllers/Toshi
*/

'use strict';

var guard = require('*/cartridge/scripts/guard');
var app = require('*/cartridge/scripts/app');


function pdp(){
    var q = request.geolocation;
    var country = request.geolocation.countryCode;
    app.getView({country : country}).render('product/components/toshi-pdp');
}

function cart(){
    var q = request.geolocation;
    var country = request.geolocation.countryCode;
    app.getView({country : country}).render('components/toshi-cart');
}

exports.PDP = guard.ensure(['get'], pdp)

exports.Cart = guard.ensure(['get'], cart)