/* 
 * Function to send notification in case the toshi service 
 */
function sendNotification(svResult) {
    var currentSite = require('dw/system/Site').getCurrent();
    var notificationUser = currentSite.getCustomPreferenceValue('toshiNotificationList');

    if (svResult.status != 'OK' && !empty(notificationUser)) {
        var app = require('*/cartridge/scripts/app');
        var Resource = require('dw/web/Resource');
        var EmailModel = app.getModel('Email');
        errorMail = EmailModel.get('toshi/toshiServiceError', notificationUser);
        errorMail.setSubject(Resource.msg('toshi.service.error', 'toshi', null));
        errorMail.send({
            error: svResult.errorMessage,
            msg: svResult.msg
        });
        //send email to the list  
    }
}

exports.sendNotification = sendNotification;
