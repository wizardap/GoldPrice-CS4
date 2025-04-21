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

  async updateMultipleGoldPrices(req, res) {
    try {
      const { priceData } = req.body;
      
      if (!priceData || !Array.isArray(priceData)) {
        return res.status(400).json({ error: 'Invalid data format. Expected array of price data.' });
      }
      
      // Xử lý từng gold price trong một Promise.all
      const results = await Promise.all(
        priceData.map(async (item) => {
          if (!item.key || !item.value) return null;
          try {
            return await goldPriceService.updateGoldPrice(item.key, item.value);
          } catch (err) {
            console.error(`Error updating ${item.key}:`, err);
            return null;
          }
        })
      );
      
      // Lọc ra các kết quả thành công
      const successfulUpdates = results.filter(Boolean);
      
      return res.status(200).json({
        message: `Updated ${successfulUpdates.length} of ${priceData.length} gold prices`,
        data: successfulUpdates
      });
    } catch (error) {
      console.error('Error in batch update:', error);
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

  async getAllGoldTypes(req, res) {
    try {
      const types = await goldPriceService.getAllGoldTypes();
      return res.status(200).json(types);
    } catch (error) {
      console.error('Error getting all gold types:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  async getGoldPriceHistory(req, res) {
    try {
      const { id: goldType } = req.params;
      const { start, end, limit } = req.query;
      
      if (!goldType) {
        return res.status(400).json({ error: 'Missing gold type parameter' });
      }
      
      const history = await goldPriceService.getGoldPriceHistory(
        goldType,
        start,
        end,
        limit ? parseInt(limit, 10) : 100
      );
      
      return res.status(200).json(history);
    } catch (error) {
      console.error('Error getting gold price history:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
}

module.exports = new GoldPriceController();