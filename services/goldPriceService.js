const { write } = require('../utils/utils');
const { producer } = require('../config/kafka');

const fetchGoldPrice = async () => {
    const minPrice = 1800;
    const maxPrice = 2200;
    const randomPrice = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);
    return parseFloat(randomPrice);
};

const updateGoldPrice = async () => {
    const price = await fetchGoldPrice();
    if (price) {
        await write('gold_price', price);
        const message = JSON.stringify({ keyID: 'gold_price', value: price, timestamp: new Date() });
        await producer.send({
            topic: 'gold-price-updates',
            messages: [{ value: message }]
        });
    }
};

module.exports = { updateGoldPrice };