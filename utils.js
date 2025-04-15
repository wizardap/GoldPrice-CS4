const Data = require('./models/data');

/**
 * Add or update a gold seller and their products
 * @param {string} key - The gold seller name
 * @param {Array} value - Array of products with type, sellPrice, buyPrice
 * @returns {Promise<Object>} The saved document
 */
async function write(key, value) {
    try {
        // Ensure each product has an updatedAt timestamp
        const productsWithTimestamp = Array.isArray(value) ?
            value.map(product => ({
                ...product,
                updatedAt: new Date()
            })) : [];

        // Using upsert - update if exists, insert if not
        const result = await Data.findOneAndUpdate(
            { keyID: key },
            { keyID: key, products: productsWithTimestamp },
            { upsert: true, new: true }
        );

        return result;
    } catch (err) {
        console.error('Database write error:', err);
        throw err;
    }
}

/**
 * Retrieve a value from the database by key
 * @param {string} key - The gold seller name
 * @returns {Promise<Array|null>} The products array or null if not found
 */
async function view(key) {
    try {
        const data = await Data.findOne({ keyID: key });
        return data ? data.products : null;
    } catch (err) {
        console.error('Database read error:', err);
        throw err;
    }
}

module.exports = {
    write,
    view
};