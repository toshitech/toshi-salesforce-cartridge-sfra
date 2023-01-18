'use strict';

/* 
 * Function to send notification in case the toshi service 
 */
function sendNotification(svResult) {
    var currentSite = require('dw/system/Site').getCurrent();
    var notificationUser = currentSite.getCustomPreferenceValue('toshiNotificationList');

    if (svResult.status != 'OK' && !empty(notificationUser)) {
        var emailHelpers = require('*/cartridge/scripts/helpers/emailHelpers');
        var Resource = require('dw/web/Resource');

        var userObject = {
            error: svResult.errorMessage,
            msg: svResult.msg
        }
        var emailObj = {
            to: notificationUser,
            subject: (Resource.msg('toshi.service.error', 'toshi', null)),
            from: currentSite.getCustomPreferenceValue('customerServiceEmail') || 'no-reply@testorganization.com'
        };

        emailHelpers.send(emailObj, 'toshi/toshiServiceError', userObject);
        // send email to the list
    }
}

exports.sendNotification = sendNotification;
