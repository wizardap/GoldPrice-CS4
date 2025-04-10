const GoldPrice = require('../models/GoldPrice');

function write(key, value) {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await GoldPrice.findOneAndUpdate(
                { keyID: key },
                { value, timestamp: new Date() },
                { upsert: true, new: true }
            );
            resolve(result._id);
        } catch (error) {
            reject(error.message);
        }
    });
}

function view(key) {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await GoldPrice.findOne({ keyID: key });
            resolve(result ? result.value : null);
        } catch (error) {
            reject(error.message);
        }
    });
}

module.exports = { write, view };