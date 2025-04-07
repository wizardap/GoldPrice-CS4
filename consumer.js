const { Kafka } = require("kafkajs");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

const kafka = new Kafka({ clientId: "ad7X_MVgRQ6F_fxqCRw0Vg", brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "ws-group" });

const run = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: "gold-price", fromBeginning: true });
    await consumer.run({
        eachMessage: async ({ message }) => {
            const data = JSON.parse(message.value.toString());
            console.log("New Price:", data);
            io.emit("price_update", data);  // Gửi giá vàng đến client
        },
    });
};

run();

server.listen(4000, () => console.log("WebSocket server running on port 4000"));