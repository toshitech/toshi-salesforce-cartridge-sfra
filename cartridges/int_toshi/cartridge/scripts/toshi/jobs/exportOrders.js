/*
    File which will query orders not being sent to Toshi and will resend them
*/
function execute(args){
    var OrderMgr =  require('dw/order/OrderMgr');
    var Order = require('dw/order/Order');
    var Status = require('dw/system/Status');
    var Logger = require('dw/system/Logger').getLogger('Toshi');
    var Transaction = require('dw/system/Transaction');
    var toshiHelpers = require('*/cartridge/scripts/toshi/toshiHelpers');

    var failedOrders = 0; 
    var successFullOrders = 0;
    var jobStatus;
    
    Logger.info('Start proccessiong orders for Toshi');
    var query = 'custom.sendToToshi = {0}' ; 
    let orders = OrderMgr.searchOrders(query, null, 1, true);

    try {
        while (orders.hasNext()){
            let order = orders.next(); 
            Logger.error('Sending order no {0}',order.orderNo);
            // send request to Toshi
            var orderSentResult = toshiHelpers.sendOrder(order);

            if (!orderSentResult) {
                Logger.error('Error sending order {0} to Toshi', order.orderNo);
                failedOrders++;
            } else {
                Transaction.wrap(function (){
                    successFullOrders++;
                    order.custom.sendToToshi = 2;
                });
            }
        }
    } catch (e){
        Logger.error('Error processing orders - {0}', e);
        return new Status(Status.ERROR, 'Error');
    }

    if (failedOrders > 0 && successFullOrders==0){
        jobStatus = new Status(Status.ERROR, 'Error');
    } else if (failedOrders > 0) {
        jobStatus = new Status(2, 'Warning'); 
    } else {
        jobStatus = new Status(Status.OK);
    }

    return jobStatus;
}
module.exports.execute = execute;
