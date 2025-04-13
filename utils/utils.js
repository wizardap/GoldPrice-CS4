const GoldPrice = require('../models/GoldPrice');

function write(key, data) {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await GoldPrice.findOneAndUpdate(
                { keyID: key },
                {
                    brands: data.brands,
                    timestamp: new Date()
                },
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
            resolve(result);
        } catch (error) {
            reject(error.message);
        }
    });
}

module.exports = { write, view };