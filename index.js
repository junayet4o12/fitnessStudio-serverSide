const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const queryString = require('querystring');
const axiosSecure = require("./axiosSecure");

// middleware
app.use(cookieParser());
app.use(cors({
  origin: ['https://fitness-studio-project-c84aa.web.app'],
  credentials: true,
  
}));
app.use(express.json());

const clientId = '23RMXW'
const redirect_uri = 'https://fitness-studio-project-c84aa.web.app/permission'

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
  const token = req.cookies.token;
  jwt.verify(token, process.env.SECRET_TOKEN, function (err, decoded) {
    if (!token) {
      return res.status(401).send({ message: "unauthorized" });
    }
    if (err) {
      console.log(err);
      return res.status(403).send({ message: "Bad Request" });
    } else {
      console.log("decoded code", decoded);
      req.user = decoded;
      next();
    }
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const FitnessStudio = client.db("FitnessStudio");
    const FeedbackCollection = FitnessStudio.collection("Feedback");
    const UsersCollection = FitnessStudio.collection("Users");
    const UserGoalCollection = FitnessStudio.collection("User_Goal");
    const BlogsCollection = FitnessStudio.collection("Blogs_Collections");


    // fitbit start
    app.get('/authorizeFitbit', (req, res) => {
      const authorizeUrl = 'https://www.fitbit.com/oauth2/authorize?' +
        queryString.stringify({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: redirect_uri,
          scope: 'activity profile cardio_fitness electrocardiogram heartrate location nutrition oxygen_saturation respiratory_rate settings sleep social temperature weight',
          state: '41c9f028be1b36f726b49e7d0d563639',
        });

      res.send({ auth: authorizeUrl });
    });

    app.post('/callbackFitbit', async (req, res) => {
      const code = req.body.exchangeCode;

      console.log('exchange code', code)

      const tokenUrl = 'https://api.fitbit.com/oauth2/token';


      try {
        const postData = new URLSearchParams();
        postData.append('code', code);
        postData.append('grant_type', 'authorization_code');
        postData.append('redirect_uri', redirect_uri);
        const tokenResponse = await axiosSecure.post(tokenUrl, postData,
        );
        const tokenData = tokenResponse.data;
        console.log("token data is", tokenData)

        res.send({ accessToken: tokenData })
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });




    // fitbit end

    // strava start

    const clientIdstrava = 120695;
    const clientSecretstrava = "50df764cea6b288538cec244e9d45ca11c7f571d";
    const StravaRedirectUri = "http://localhost:5173/dashboard/strava_connect";

    app.get('/authorizestrava', (req, res) => {
      const authorizeUrl = 'https://www.strava.com/oauth/authorize?' +
        queryString.stringify({
          response_type: 'code',
          client_id: clientIdstrava,
          redirect_uri: StravaRedirectUri,
          scope: "read,activity:read_all",
          state: "41c9f028be1b36f726b49e7d0d563639",
        });

      res.send({ auth: authorizeUrl });
    });

    app.post("/callbackstrava", async (req, res) => {
      const code = req.body.exchangeCode;

      console.log("exchange code", code);

      const tokenUrl = "https://www.strava.com/oauth/token";

      try {
        console.log("the code is", code);
        const postData = new URLSearchParams();
        postData.append("client_id", 120695);
        postData.append("client_secret", clientSecretstrava);
        postData.append("code", code);
        postData.append("grant_type", "authorization_code");
        postData.append("redirect_uri", StravaRedirectUri);
        const tokenResponse = await axios.post(
          "https://www.strava.com/oauth/token",
          postData
        );

        // Extract the access token from the response
        console.log(tokenResponse.data)
        const accessToken = tokenResponse.data.access_token;

        // Return the access token to the client
        res.json({ accessToken });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
    // strava end

    // feedbackkk start

    app.get("/feedback", async (req, res) => {
      const result = await FeedbackCollection.find().toArray();
      res.send(result);
    });

    // feedback end

    // Auth related api start
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.SECRET_TOKEN, {
        expiresIn: "1h",
      });
      console.log("token is", token);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "None",
        })
        .send({ setToken: "success" });
    });

    app.post("/logout", async (req, res) => {
      res
        .cookie("token", "", { expires: new Date(0), httpOnly: true })
        .send({ message: "logged out Successfully" });
    });

    // Auth related api end

    // fitbit api


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

    app.get('/user_goal/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      console.log(email)
      if (email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden' })
      }
      else {
        const query = { user_email: email };
        const result = await UserGoalCollection.find(query).toArray();
        res.send(result)
        app.get("/user_goal", async (req, res) => {
          const result = await UserGoalCollection.find().toArray();
          res.send(result);
        });

      }
    })

    app.get("/users", verifyToken, async (req, res) => {
      const result = await UsersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      } else {
        const query = { email: email };
        const result = await UsersCollection.findOne(query);
        res.send(result);
      }
    });

    app.put("/update_user_data/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const data = req?.body;
      if (email !== req?.user?.email) {
        return res.status(403).send({ message: "forbidden" });
      } else {
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


    // blogs start here
    app.get('/blogs', async (req, res) => {
      const result = await BlogsCollection.find().toArray()
      res.send(result)
    })

    app.get('/blogs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await BlogsCollection.findOne(query)
      res.send(result);
    })

    // using query for specific users blog show
    app.get('/my_blogs/:email', async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email }
      const result = await BlogsCollection.find(query).toArray()
      res.send(result)
    })

    app.post("/post_blog", async (req, res) => {
      const data = req?.body;
      const result = await BlogsCollection.insertOne(data);
      res.send(result);
    })

    app.delete('/delete_blog/:id', async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await BlogsCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/update_blog/:id", async (req, res) => {
      const data = req?.body;
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          blogDes: data?.blogDes,
          blogImg: data?.blogImg,
          blogName: data?.blogName
        }
      }
      const result = await BlogsCollection.updateOne(query, updatedData)
      res.send(result)
    })
    // blogs end here

    // await client.connect();
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
