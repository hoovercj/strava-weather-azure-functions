module.exports = function (context, myTimer) {
    var timeStamp = new Date().toISOString();

    context.log('Staying awake.', timeStamp);   
    
    context.done();
};