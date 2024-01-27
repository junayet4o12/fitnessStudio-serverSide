const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const app = express();
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require('jsonwebtoken');
// middleware
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,

}));
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vqva6ft.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify token middleware

const verifyToken = async (req, res, next) => {
  const token = req.cookies.token
  jwt.verify(token, process.env.SECRET_TOKEN, function (err, decoded) {
    if (!token) {
      return res.status(401).send({ message: 'unauthorized' })
    }
    if (err) {
      return res.status(403).send({ message: 'Bad Request' })
    }
    else {
      console.log('decoded code', decoded)
      req.user = decoded
      next()
    }
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const FitnessStudio = client.db("FitnessStudio");
    const FeedbackCollection = FitnessStudio.collection("Feedback");
    const UsersCollection = FitnessStudio.collection("Users");
    const UserGoalCollection = FitnessStudio.collection("User_Goal");

    // feedback start

    app.get("/feedback", verifyToken, async (req, res) => {
      const result = await FeedbackCollection.find().toArray();
      res.send(result);
    });

    // feedback end

    // Auth related api start
    app.post('/jwt', async (req, res) => {
      const user = req.body
      console.log(user)
      const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '1h' })
      console.log('token is', token)
      res.
        cookie("token", token,
          {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax'
          })
        .send({ setToken: 'success' })
    })

        // Auth related api end


    // user start
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await UsersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: " use already exists" });
      }
      const result = await UsersCollection.insertOne(user);
      res.send(result);
    });


    app.post("/user_goal", verifyToken, async (req, res) => {
      const goalInfo = req.body;
      const result = await UserGoalCollection.insertOne(goalInfo);
      res.send(result);
    });


    app.get("/users", verifyToken, async (req, res) => {
      const result = await UsersCollection.find().toArray();
      res.send(result);
    });


    app.get("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden' })
      }
      else {

        const query = { email: email };
        const result = await UsersCollection.findOne(query);
        res.send(result);
      }
    });


    app.put("/update_user_data/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const data = req?.body;
      if (email !== req?.user?.email) {
        return res.status(403).send({ message: 'forbidden' })

      }
      else {

        const query = { email: email };
        console.log(data);
        const updatedData = {
          $set: {
            name: data?.name,
            birthDay: data?.birthDay,
            weight: data?.weight,
            height: data?.height,
            gender: data?.gender,
          },
        };
        const result = await UsersCollection.updateOne(query, updatedData);
        res.send(result);
      }
    });

    // user end
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Fitness is running...");
});

app.listen(port, () => {
  console.log(`Fitness are Running on port ${port}`);
});

