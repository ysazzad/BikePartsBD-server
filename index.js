const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const app = express()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000

    // app.use(cors())
    /
    app.use(cors({ origin: "https://bike-parts-30217.web.app/" }))
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lnf4v.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    });


}
async function run() {
    try {
        client.connect()
        const itemCollection = client.db('bike_parts').collection('parts');
        const bookingCollection = client.db('bike_parts').collection('booking');
        const reviewCollection = client.db('bike_parts').collection('review');
        const userCollection = client.db('bike_parts').collection('users');
        // const paymentCollection = client.db('doctors_portal').collection('payments');
        const paymentCollection = client.db('bike_parts').collection('payments');
        const profileCollection = client.db('bike_parts').collection('profile');
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
        app.post("/part", async (req, res) => {
            const newPart = req.body
            const result = await itemCollection.insertOne(newPart)
            res.send(result)
        })
        app.get("/booking", verifyJWT, async (req, res) => {
            const user = req.query.user;
            const decodedEmail = req.decoded.email
            if (user === decodedEmail) {
                const query = { user: user }
                const bookings = await bookingCollection.find(query).toArray()
                return res.send(bookings)
            }
            else {
                return res.status(403).send({ message: 'forbidden access' })
            }

        })
        app.get('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking);
        })

        app.post("/booking", async (req, res) => {
            const booking = req.body
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })

        app.delete("/booking/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingCollection.deleteOne(query)
            res.send(result)

        })
        //delete item
        app.delete("/part/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await itemCollection.deleteOne(query)
            res.send(result)

        })
        app.post("/review", async (req, res) => {
            const review = req.body
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })
        app.get("/review", async (req, res) => {
            const query = {}
            const cursor = reviewCollection.find(query)
            const review = await cursor.toArray()
            res.send(review)
        })
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });
        app.patch('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await bookingCollection.updateOne(filter, updatedDoc);
            res.send(updatedBooking);
        })

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updatedDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updatedDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token })
        })
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.put("/user/admin/:email", verifyJWT, async (req, res) => {
            const email = req.params.email
            const requester = req.decoded.email
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                const filter = { email: email }
                const updatedDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updatedDoc)
                res.send(result)
            }
            else {
                res.status(403).send({ message: 'forbidden' })
            }

        })
        // app.put('/profile/:id', async (req, res) => {
        //     const id = req.params.id
        //     const updatedUser = req.body
        //     const filter = { _id: ObjectId(id) };
        //     const options = { upsert: true };
        //     const updatedDoc = {
        //         $set: {
        //             updatedUser
        //         }
        //     };
        //     const result = await profileCollection.updateOne(filter, updatedDoc, options);
        //     res.send(result);

        // })
        app.put("/profile/:email", async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = {
                email: email
            }
            const options = { upsert: true };
            const updatedDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.get("/profile", async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const query = { email: email }
            const cursor = userCollection.find(query)
            const result = await cursor.toArray()
            console.log(result);
            res.send(result);
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