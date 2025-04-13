const goldPriceRepository = require('../repositories/goldPriceRepository');
const messageBrokerService = require('./messageBrokerService');

class GoldPriceService {
    constructor() {
        // Dữ liệu mẫu
        this.sampleData = {
            brands: [
                {
                    name: "DOJI",
                    items: [
                        { type: "Bar", buy: 80000000, sell: 82000000 },
                        { type: "Jewelry", buy: 1500000, sell: 1600000 }
                    ]
                },
                {
                    name: "PNJ",
                    items: [
                        { type: "Jewelry", buy: 2200000, sell: 2300000 }
                    ]
                },
                {
                    name: "SJC",
                    items: [
                        { type: "Bar", buy: 82000000, sell: 84000000 }
                    ]
                }
            ]
        };
    }

    async fetchGoldPrice() {
        // Tạo biến động giá so với dữ liệu mẫu
        const randomizedData = {
            brands: this.sampleData.brands.map(brand => {
                return {
                    name: brand.name,
                    items: brand.items.map(item => {
                        // Biến động giá +/- 2%
                        const buyFluctuation = Math.random() * 0.04 - 0.02;
                        const sellFluctuation = Math.random() * 0.04 - 0.02;

                        const newBuy = Math.round(item.buy * (1 + buyFluctuation));
                        const newSell = Math.round(item.sell * (1 + sellFluctuation));

                        return {
                            type: item.type,
                            buy: newBuy,
                            sell: newSell
                        };
                    })
                };
            })
        };

        return randomizedData;
    }

    async updateGoldPrice() {
        try {
            const priceData = await this.fetchGoldPrice();
            if (priceData) {
                await goldPriceRepository.save('gold_price', priceData);
                await messageBrokerService.publishMessage({
                    keyID: 'gold_price',
                    data: priceData,
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error('Error updating gold price:', error.message);
        }
    }
}

module.exports = new GoldPriceService();