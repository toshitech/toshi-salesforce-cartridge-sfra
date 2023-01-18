'use strict';
var Logger = require('dw/system/Logger').getLogger('Toshi');

module.exports = function (serviceName) {
    var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
    return LocalServiceRegistry.createService(serviceName, {
        createRequest: function (svc, params) {
            svc.addHeader('X-Toshi-Server-Api-Key', params.apiKey);
            svc.addHeader('Content-Type','application/json');
            return JSON.stringify(params.request);
        },
        parseResponse: function (svc, response) {
            try {
                return JSON.parse(response.text);
            } catch (e){
                Logger.error('Error calling Toshi service {0}', e);
            }
        },
        filterLogMessage: function (msg) {
            return msg;
        }
    });
};
