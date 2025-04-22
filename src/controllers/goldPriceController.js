// Gold price controller handling HTTP requests
const goldPriceService = require('../services/goldPriceService');

class GoldPriceController {
  async updateGoldPrice(req, res) {
    try {
      const { key, value } = req.body;

      if (!key || !value) {
        return res.status(400).json({ error: 'Missing key or value' });
      }

      // Validate that value contains required properties
      if (typeof value !== 'object' || !value.buy || !value.sell) {
        return res.status(400).json({ error: 'Invalid gold price data. Must include buy and sell prices' });
      }

      const result = await goldPriceService.updateGoldPrice(key, value);

      return res.status(200).json({
        message: 'Gold price updated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error updating gold price:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  async getGoldPrice(req, res) {
    try {
      const goldType = req.params.id;

      if (!goldType) {
        return res.status(400).json({ error: 'Missing gold type parameter' });
      }

      const price = await goldPriceService.getLatestGoldPrice(goldType);

      if (!price) {
        return res.status(404).json({ error: `No data found for gold type: ${goldType}` });
      }

      return res.status(200).json(price);
    } catch (error) {
      console.error('Error getting gold price:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
}

module.exports = new GoldPriceController();