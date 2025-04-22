const { body, param, validationResult } = require('express-validator');

// Middleware kiểm tra kết quả validation
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Cải thiện validation rules
const validateGoldPriceUpdate = [
    body('key')
        .isString().withMessage('Gold type must be a string')
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Gold type must be between 1-50 characters')
        .escape(), // Prevent XSS

    body('value')
        .isObject().withMessage('Value must be an object'),

    body('value.buy')
        .isNumeric().withMessage('Buy price must be a number')
        .toFloat()
        .isFloat({ min: 0, max: 1000000000 }).withMessage('Buy price must be between 0 and 1,000,000,000'),

    body('value.sell')
        .isNumeric().withMessage('Sell price must be a number')
        .toFloat()
        .isFloat({ min: 0, max: 1000000000 }).withMessage('Sell price must be between 0 and 1,000,000,000'),

    body('value.unit')
        .optional()
        .isString().withMessage('Unit must be a string')
        .trim()
        .isLength({ max: 20 }).withMessage('Unit must be max 20 characters')
        .escape(), // Prevent XSS

    validate
];

// Validation cho param goldType
const validateGoldTypeParam = [
    param('id')
        .isString().withMessage('Gold type parameter must be a string')
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage('Gold type length must be between 1 and 50 characters')
        .matches(/^[A-Za-z0-9_-]+$/).withMessage('Gold type can only contain alphanumeric characters, hyphens and underscores')
        .escape(), // Prevent XSS

    validate
];

module.exports = {
    validateGoldPriceUpdate,
    validateGoldTypeParam
};