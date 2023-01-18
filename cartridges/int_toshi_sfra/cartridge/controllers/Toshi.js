'use strict';

var server = require('server');

server.get('PDP', server.middleware.https, function(req, res, next) {
    var country = req.geolocation.countryCode;

    res.render('product/components/toshi-pdp', {
        country: country
    });

    next();
});

server.get('Cart', server.middleware.https, function(req, res, next) {
    var country = request.geolocation.countryCode;

    res.render('components/toshi-cart', {
        country: country
    });

    next();
});

module.exports = server.exports();
