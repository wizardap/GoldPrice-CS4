// GoldPrice model for TimescaleDB
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const GoldPrice = sequelize.define('GoldPrice', {
        // Instead of having just 'id' as the primary key,
        // make a composite primary key with 'type' and 'timestamp'
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true, // Make 'type' part of the primary key
            comment: 'Gold type (e.g., SJC, DOJI)'
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            primaryKey: true, // Make 'timestamp' part of the primary key
            comment: 'Timestamp of the price update'
        },
        buy: {
            type: DataTypes.DECIMAL(14, 2),
            allowNull: false,
            comment: 'Buy price'
        },
        sell: {
            type: DataTypes.DECIMAL(14, 2),
            allowNull: false,
            comment: 'Sell price'
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'VND/lượng',
            comment: 'Price unit'
        }
    }, {
        tableName: 'gold_prices',
        timestamps: false, // Disable Sequelize's default timestamps since we're using our own
        indexes: [
            {
                name: 'idx_gold_prices_type',
                fields: ['type']
            }
            // We don't need a separate index for timestamp since it's part of the primary key
        ]
    });

    // Setup the TimescaleDB hypertable after model creation
    sequelize.afterSync(() => {
        return sequelize.query(`
            -- Tăng chunk interval từ 1 giờ lên 1 ngày
            SELECT create_hypertable('gold_prices', 'timestamp', 
                if_not_exists => TRUE,
                chunk_time_interval => INTERVAL '1 day',
                create_default_indexes => TRUE);
            
            -- Tối ưu compression
            ALTER TABLE gold_prices SET (
                timescaledb.compress,
                timescaledb.compress_segmentby = 'type'
            );
            
            -- Dùng chung một câu lệnh để giảm round-trip
            SELECT add_compression_policy('gold_prices', INTERVAL '7 days'),
                   set_chunk_time_interval('gold_prices', INTERVAL '1 day');
            
            -- Tối ưu index cho truy vấn phổ biến
            CREATE INDEX IF NOT EXISTS idx_gold_prices_type_time ON gold_prices (type, timestamp DESC);
        `);
    });

    return GoldPrice;
};