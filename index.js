const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());



const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vgt34f5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



// middlewares 
const logger = (req, res, next) => {
    console.log('log: info', req.method, req.url);
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next();
    })
}

async function run() {
  try {
    
    const foodCollection = client.db('sharefoodDB').collection('food');

    // auth related api
    app.post('/jwt', logger, async (req, res) => {
        const user = req.body;
        console.log('user for token', user);
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        })
            .send({ success: true });
    })

    app.post('/logout', async (req, res) => {
        const user = req.body;
        console.log('logging out', user);
        res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })

    
    // add new food related api
    app.post('/food', async (req, res) => {
        const newfood = req.body;
        console.log(newfood);
        const result = await foodCollection.insertOne(newfood);
        res.send(result);
      })

      //http://localhost:5000/getallfood/v1?foodName=kacchi
      //http://localhost:5000/getallfood/v1?sortField=price&sortOrder=desc
      app.get('/getallfood/v1', async (req, res) => {
        
        let query = {}
        let sortObj = {}
        const foodName = req.query.foodName;

        const sortField = req.query.sortField
        const sortOrder = req.query.sortOrder


        if(foodName){
            query.foodName = foodName
        }

        if(sortField && sortOrder){
            sortObj[sortField] = sortOrder
        }


        const cursor = foodCollection.find(query).sort(sortObj);
        const result = await cursor.toArray();
        res.send(result);
      })

    //   app.get('/getallfood/v1', async (req, res) => {
    //     const cursor = foodCollection.find();
    //     const result = await cursor.toArray();
    //     res.send(result);
    //   })





    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Brand Shop server is running')
  })
  
  app.listen(port, () => {
    console.log(`Brand Shop is running on port: ${port}`)
  })