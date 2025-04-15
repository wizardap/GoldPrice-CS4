const socketService = require('../services/socketService');
const goldPriceRepository = require('../repositories/goldPriceRepository');
const cacheService = require('../services/cacheService');
const GoldPriceEvent = require('../events/goldPriceEvents');

class GoldPriceEventHandlers {
    constructor(messageBroker) {
        this.messageBroker = messageBroker;
        this.registerHandlers();
    }

    registerHandlers() {
        // Register event handlers
        this.messageBroker.on(GoldPriceEvent.TYPES.PRICE_UPDATED, this.handlePriceUpdate.bind(this));
        this.messageBroker.on(GoldPriceEvent.TYPES.PRICE_REQUESTED, this.handlePriceRequest.bind(this));
        this.messageBroker.on(GoldPriceEvent.TYPES.NEW_BRAND_ADDED, this.handleNewBrand.bind(this));
        this.messageBroker.on(GoldPriceEvent.TYPES.SYSTEM_ALERT, this.handleSystemAlert.bind(this));

        // Log all events
        this.messageBroker.on('*', this.logEvent.bind(this));
    }

    // Handle price update events
    async handlePriceUpdate(event) {
        try {
            console.log(`Processing price update for ${event.keyID}`);

            // Update cache
            await cacheService.set(event.keyID, {
                keyID: event.keyID,
                items: event.data.items,
                timestamp: event.timestamp
            });

            // Forward to socket clients through existing mechanism
            socketService.bufferMessage(event);
        } catch (error) {
            console.error(`Error handling price update: ${error.message}`);
        }
    }

    // Handle price request events
    async handlePriceRequest(event) {
        try {
            console.log(`Handling price request for ${event.keyID}`);
            const result = await goldPriceRepository.findByKey(event.keyID);

            if (result) {
                // Publish the result back as a price update event
                const responseEvent = GoldPriceEvent.priceUpdated(
                    event.keyID,
                    { items: result.items },
                    { requestId: event.metadata.requestId }
                );

                await this.messageBroker.publishMessage(responseEvent);
            }
        } catch (error) {
            console.error(`Error handling price request: ${error.message}`);
        }
    }

    // Handle new brand events
    async handleNewBrand(event) {
        try {
            console.log(`New brand added: ${event.keyID}`);
            // This could trigger system reconfigurations, etc.
        } catch (error) {
            console.error(`Error handling new brand: ${error.message}`);
        }
    }

    // Handle system alerts
    async handleSystemAlert(event) {
        try {
            console.log(`System alert: ${event.data.message}`);
            // Could notify admins or trigger automated responses
        } catch (error) {
            console.error(`Error handling system alert: ${error.message}`);
        }
    }

    // Log all events (wildcard handler)
    logEvent(event, eventType) {
        console.log(`EVENT [${eventType}]: ${event.keyID}`);
    }
}

module.exports = GoldPriceEventHandlers;