const logger = require("./logger");

function retryWithExponentialBackoff(fn, maxAttempt=5,baseDelayMs =1000){
    let attempt = 1

    const execute = async ()=>{
        try{
            return await fn();
        }
        catch (error){
            if (attempt >= maxAttempt){
                logger.error(`Attempt limit exceed (${maxAttempt}): ${error.message}`);
                throw error;
            }

            const delayMs = baseDelayMs*Math.pow(2,attempt-1);
            // Thêm jitter chống thundering herd (nhiều retry cùng một thời điểm gây quá tải)
            const jitter = Math.random()*100;
            logger.warn(`${attempt}/${maxAttempt} retry failed. Wait ${delayMs} seconds`);
            attempt++;
            await new Promise(resolve => setTimeout(resolve,delayMs+jitter));

            return execute();
        }
    };

    return execute();
}


module.exports ={ retryWithExponentialBackoff};