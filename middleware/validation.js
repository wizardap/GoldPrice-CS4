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
    if (!data || !data.brands || !Array.isArray(data.brands)) {
        return res.status(400).json({
            status: 'error',
            message: 'data must contain a brands array'
        });
    }

    // Kiểm tra từng brand
    for (const brand of data.brands) {
        if (!brand.name || typeof brand.name !== 'string') {
            return res.status(400).json({
                status: 'error',
                message: 'Each brand must have a name property as string'
            });
        }

        if (!brand.items || !Array.isArray(brand.items)) {
            return res.status(400).json({
                status: 'error',
                message: `Brand ${brand.name} must have an items array`
            });
        }

        // Kiểm tra từng item
        for (const item of brand.items) {
            if (!item.type || typeof item.type !== 'string') {
                return res.status(400).json({
                    status: 'error',
                    message: `Each item in brand ${brand.name} must have a type property as string`
                });
            }

            if (typeof item.buy !== 'number' || typeof item.sell !== 'number') {
                return res.status(400).json({
                    status: 'error',
                    message: `Each item in brand ${brand.name} must have buy and sell properties as numbers`
                });
            }
        }
    }

    next();
};

module.exports = { validateGoldPriceData };