const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lnf4v.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect()
        const itemCollection = client.db('bike_parts').collection('parts');
        const bookingCollection = client.db('bike_parts').collection('booking');
        //get all items
        app.get("/part", async (req, res) => {
            const query = {}
            const cursor = itemCollection.find(query)
            const items = await cursor.toArray()
            res.send(items)
        })
        //get single item
        app.get("/part/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const items = await itemCollection.findOne(query);
            res.send(items);
        })
        app.get("/booking", async (req, res) => {
            const user = req.query.user
            const query = { user: user }
            const bookings = await bookingCollection.find(query).toArray()
            res.send(bookings)
        })
        app.post("/booking", async (req, res) => {
            const booking = req.body
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })

    }
    finally {

    }

}
run().catch(console.dir)
app.get('/', (req, res) => {
    res.send('Hello Biker!')
})

app.listen(port, () => {
    console.log(`Bike app listening on port ${port}`)
})