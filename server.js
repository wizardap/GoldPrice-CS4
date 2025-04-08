const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const lib = require('./utils');
const cors = require('cors');
const app = express();
const server = require('http').createServer(app);
const {Kafka} = require('kafkajs');
const port = 8080;

app.use(bodyParser.json());
// create socket
app.use(cors());

const kafka = new Kafka({
    clientId: 'ad7X_MVgRQ6F_fxqCRw0Vg',
    brokers: ['kafka:9092']
});
const producer = kafka.producer();
app.post('/add', async (req, res) => {
    try {
        const { key, value } = req.body;
        await producer.connect();
        await producer.send({
            topic: "gold-price",
            messages: [
                { value: JSON.stringify(req.body) }
            ]
        });
        await producer.disconnect();
        await lib.write(key, value);
        res.send("Insert a new record successfully!");
    } catch (err) {
        res.send(err.toString());
    }
});

app.get('/get/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const value = await lib.view(id);
        res.status(200).send(value);
    } catch (err) {
        res.send(err)
    }
});


app.get('/viewer/:id', (req, res) => {
    const id = req.params.id;
    res.sendFile(path.join(__dirname, "viewer.html"));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
server.listen(8081, () => {
    console.log('Socket is running on port 8081');
}
);