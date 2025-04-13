const GoldPrice = require('../models/GoldPrice');

class GoldPriceRepository {
    async save(key, data) {
        try {
            const result = await GoldPrice.findOneAndUpdate(
                { keyID: key },
                {
                    brands: data.brands,
                    timestamp: new Date()
                },
                { upsert: true, new: true }
            );
            return result._id;
        } catch (error) {
            throw new Error(`Failed to save gold price: ${error.message}`);
        }
    }

    async findByKey(key) {
        try {
            const result = await GoldPrice.findOne({ keyID: key });
            return result;
        } catch (error) {
            throw new Error(`Failed to find gold price: ${error.message}`);
        }
    }
}

module.exports = new GoldPriceRepository();