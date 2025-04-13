const goldPriceRepository = require('../repositories/goldPriceRepository');
const messageBrokerService = require('./messageBrokerService');

class GoldPriceService {
    async fetchGoldPrice() {
        const minPrice = 1800;
        const maxPrice = 2200;
        const randomPrice = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);
        return parseFloat(randomPrice);
    }

    async updateGoldPrice() {
        try {
            const price = await this.fetchGoldPrice();
            if (price) {
                await goldPriceRepository.save('gold_price', price);
                await messageBrokerService.publishMessage({
                    keyID: 'gold_price',
                    value: price,
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error('Error updating gold price:', error.message);
        }
    }
}

module.exports = new GoldPriceService();