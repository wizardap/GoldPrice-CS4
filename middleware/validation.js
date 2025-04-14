const validateGoldPriceData = (req, res, next) => {
    const { keyID, data } = req.body;

    // Kiểm tra keyID
    if (!keyID || typeof keyID !== 'string') {
        return res.status(400).json({
            status: 'error',
            message: 'keyID is required and must be a string'
        });
    }

    // Kiểm tra cấu trúc data
    if (!data || !data.items || !Array.isArray(data.items)) {
        return res.status(400).json({
            status: 'error',
            message: 'data must contain an items array'
        });
    }

    // Kiểm tra từng item
    for (const item of data.items) {
        if (!item.type || typeof item.type !== 'string') {
            return res.status(400).json({
                status: 'error',
                message: `Each item must have a type property as string`
            });
        }

        if (typeof item.buy !== 'number' || typeof item.sell !== 'number') {
            return res.status(400).json({
                status: 'error',
                message: `Each item must have buy and sell properties as numbers`
            });
        }
    }

    next();
};

module.exports = { validateGoldPriceData };