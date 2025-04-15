/**
 * Domain Event model for gold price events
 */
class GoldPriceEvent {
    static TYPES = {
        PRICE_UPDATED: 'PRICE_UPDATED',
        PRICE_REQUESTED: 'PRICE_REQUESTED',
        NEW_BRAND_ADDED: 'NEW_BRAND_ADDED',
        SYSTEM_ALERT: 'SYSTEM_ALERT'
    };

    constructor(type, keyID, data, metadata = {}) {
        this.eventType = type;
        this.keyID = keyID;
        this.data = data;
        this.timestamp = new Date();
        this.metadata = metadata;
    }

    static priceUpdated(keyID, priceData, metadata = {}) {
        return new GoldPriceEvent(
            GoldPriceEvent.TYPES.PRICE_UPDATED,
            keyID,
            priceData,
            metadata
        );
    }

    static priceRequested(keyID, requestData, metadata = {}) {
        return new GoldPriceEvent(
            GoldPriceEvent.TYPES.PRICE_REQUESTED,
            keyID,
            requestData,
            metadata
        );
    }

    static newBrandAdded(keyID, brandData, metadata = {}) {
        return new GoldPriceEvent(
            GoldPriceEvent.TYPES.NEW_BRAND_ADDED,
            keyID,
            brandData,
            metadata
        );
    }

    static systemAlert(keyID, alertData, metadata = {}) {
        return new GoldPriceEvent(
            GoldPriceEvent.TYPES.SYSTEM_ALERT,
            keyID,
            alertData,
            metadata
        );
    }
}

module.exports = GoldPriceEvent;