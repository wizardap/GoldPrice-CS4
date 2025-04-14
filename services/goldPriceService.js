const goldPriceRepository = require('../repositories/goldPriceRepository');
const messageBrokerService = require('./messageBrokerService');

class GoldPriceService {
    constructor() {
        // Sample data for gold prices by brand
        this.brandData = {
            "doji": {
                items: [
                    { type: "Bar", buy: 80000000, sell: 82000000 },
                    { type: "Jewelry", buy: 1500000, sell: 1600000 }
                ]
            },
            "pnj": {
                items: [
                    { type: "Jewelry", buy: 2200000, sell: 2300000 }
                ]
            },
            "sjc": {
                items: [
                    { type: "Bar", buy: 82000000, sell: 84000000 }
                ]
            }
        };

        this.brands = Object.keys(this.brandData);
    }

    // Generate randomized price data for a specific brand
    async fetchGoldPrice(brand) {
        const brandLower = brand.toLowerCase();
        const brandTemplate = this.brandData[brandLower];

        if (!brandTemplate) return null;

        // Create random price fluctuations
        const randomizedItems = brandTemplate.items.map(item => {
            const buyFluctuation = Math.random() * 0.04 - 0.02;  // ±2%
            const sellFluctuation = Math.random() * 0.04 - 0.02; // ±2%

            return {
                type: item.type,
                buy: Math.round(item.buy * (1 + buyFluctuation)),
                sell: Math.round(item.sell * (1 + sellFluctuation))
            };
        });

        return { items: randomizedItems };
    }

    // Update price for a single brand
    async updateSingleBrandPrice(brand) {
        try {
            const brandLower = brand.toLowerCase();
            const priceData = await this.fetchGoldPrice(brandLower);

            if (!priceData) return false;

            // Save to database
            await goldPriceRepository.save(brandLower, priceData);

            // Publish to message broker
            await messageBrokerService.publishMessage({
                keyID: brandLower,
                data: priceData,
                timestamp: new Date()
            });

            return true;
        } catch (error) {
            console.error(`Error updating ${brand} price: ${error.message}`);
            return false;
        }
    }

    // Update prices for all brands
    async updateGoldPrice() {
        try {
            const updatePromises = this.brands.map(brand =>
                this.updateSingleBrandPrice(brand)
            );

            await Promise.allSettled(updatePromises);
            return true;
        } catch (error) {
            console.error(`Error updating gold prices: ${error.message}`);
            return false;
        }
    }

    // Add a new brand or update existing brand
    async addBrand(keyID, data) {
        try {
            const keyIDLower = keyID.toLowerCase();

            // Add to brand list if new
            if (!this.brandData[keyIDLower]) {
                this.brandData[keyIDLower] = { items: [] };
                this.brands = Object.keys(this.brandData);
            }

            // Update sample data
            this.brandData[keyIDLower] = data;

            // Save to database
            await goldPriceRepository.save(keyIDLower, data);

            // Publish to message broker
            await messageBrokerService.publishMessage({
                keyID: keyIDLower,
                data,
                timestamp: new Date()
            });

            return true;
        } catch (error) {
            console.error(`Error adding/updating brand ${keyID}: ${error.message}`);
            return false;
        }
    }
}

module.exports = new GoldPriceService();