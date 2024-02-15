const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();

const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const PORT = process.env.PORT || 4000;
require("dotenv").config();
const jwt = require("jsonwebtoken");
const axios = require("axios");
const queryString = require("querystring");
const axiosSecure = require("./axiosSecure");
const frontendUrl = "http://localhost:5173";
// socketio connect  start
const socketIo = require('socket.io')
const http = require('http')
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: frontendUrl, 
    methods: ["GET", "POST"],
    credentials: true
  }
})

io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle incoming messages
  socket.on('message', (message) => {
    console.log('Message received:', message);
    // Broadcast the message to all connected clients
    io.emit('message', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// socketio connect  end
// middlewareee
app.use(cookieParser());
app.use(
  cors({
    origin: [frontendUrl],
    credentials: true,
  })
);

app.use(express.json());

const clientId = "23RMXW";
const redirect_uri = `${frontendUrl}/permission`;

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


    // verify Admin  start
    const verifyadmin = async (req, res, next) => {
      const email = req?.user?.email;
      const query = { email: email };
      const user = await UsersCollection.findOne(query);
      const isadmin = user?.admin === true
      if (!isadmin) {
        return res.status(403).send({ message: "forbidden" })
      }

      next()
    }
    // verify Admin end 

    // fitbit start
    app.get("/authorizeFitbit", (req, res) => {
      const authorizeUrl =
        "https://www.fitbit.com/oauth2/authorize?" +
        queryString.stringify({
          response_type: "code",
          client_id: clientId,
          redirect_uri: redirect_uri,
          scope:
            "activity profile cardio_fitness electrocardiogram heartrate location nutrition oxygen_saturation respiratory_rate settings sleep social temperature weight",
          state: "41c9f028be1b36f726b49e7d0d563639",
        });

      res.send({ auth: authorizeUrl });
    });

    app.post("/callbackFitbit", async (req, res) => {
      const code = req.body.exchangeCode;

      console.log("exchange code", code);

      const tokenUrl = "https://api.fitbit.com/oauth2/token";

      try {
        const postData = new URLSearchParams();
        postData.append("code", code);
        postData.append("grant_type", "authorization_code");
        postData.append("redirect_uri", redirect_uri);
        const tokenResponse = await axiosSecure.post(tokenUrl, postData);
        const tokenData = tokenResponse.data;
        console.log("token data is", tokenData);

        res.send({ accessToken: tokenData });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // fitbit end...........

    // strava start

    const clientIdstrava = 120695;
    const clientSecretstrava = "50df764cea6b288538cec244e9d45ca11c7f571d";
    const StravaRedirectUri = `${frontendUrl}/dashboard/strava_connect`;

    app.get("/authorizestrava", (req, res) => {
      const authorizeUrl =
        "https://www.strava.com/oauth/authorize?" +
        queryString.stringify({
          response_type: "code",
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
        console.log(tokenResponse.data);
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

    app.get("/user_goal/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      if (email !== req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      } else {
        const query = { user_email: email };
        const result = await UserGoalCollection.find(query).toArray();
        res.send(result);
        app.get("/user_goal", async (req, res) => {
          const result = await UserGoalCollection.find().toArray();
          res.send(result);
        });
      }
    });

    app.get("/users", verifyToken, async (req, res) => {
      const name = req.query.name
      const page = req.query.page
      const size = req.query.size
      let query = {}
      if (req.query.name) {
        query = {
          name: { $regex: name, $options: "i" }
        }
      }
      const result = await UsersCollection
        .find(query)
        .skip(parseInt(size * page))
        .limit(parseInt(size))
        .toArray();
      res.send(result);
    });
    app.get("/search_people/:name", verifyToken, async (req, res) => {
      const name = req.params.name
      let query = {}
      if (req.params.name) {
        query = {
          name: { $regex: name, $options: "i" }
        }
      }

      const result = await UsersCollection.find(query).toArray();
      res.send(result);
    });
    app.get('/usersCount', verifyToken, async (req, res) => {
      const count = await UsersCollection.estimatedDocumentCount()
      res.send({ count })
    })

    // user update user to admin
    // make admin
    app.put(
      "/make-admin/:email",
      verifyToken,
      verifyadmin,
      async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const updatedRole = {
          $set: {
            role: "Admin",
          },
        };
        const result = await UsersCollection.updateOne(query, updatedRole);
        res.send(result);
      }
    );
    // make admin to user
    app.put(
      "/make-user/:email",
      verifyToken,
      verifyadmin,
      async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const updatedRole = {
          $set: {
            role: "user",
          },
        };
        const result = await UsersCollection.updateOne(query, updatedRole);
        res.send(result);
      }
    );

    // Users Delete
    app.delete('/users/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await UsersCollection.deleteOne(query);
      res.send(result);
    })

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
    app.get('/single_user/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await UsersCollection.findOne(query);
      res.send(result)
    })

    app.put("/update_user_data/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const data = req?.body;
      if (email !== req?.user?.email) {
        return res.status(403).send({ message: "forbidden" });
      } else {
        const query = { email: email };
        const updatedData = {
          $set: {
            name: data?.name,
            birthDay: data?.birthDay,
            weight: data?.weight,
            height: data?.height,
            gender: data?.gender,
            bio: data?.bio,
          },
        };
        const result = await UsersCollection.updateOne(query, updatedData);
        res.send(result);
      }
    });
    // user end
    // admin start
    app.get('/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden' })
      }
      const query = { email: email }
      const user = await UsersCollection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.admin === true
      }
      res.send({ admin })
    })
    // admin end

    // blogs start here
    app.get("/blogs", async (req, res) => {
      const search = req.query.search;
      let query = {};
      if (req.query.search) {
        query = {
          blogName: { $regex: search, $options: "i" },
        };
      }

      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)
      console.log(page);
      console.log(size);
      const result = await BlogsCollection.find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/blogcount", async (req, res) => {
      const count = await BlogsCollection.estimatedDocumentCount()
      res.send({ count })
    })

    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await BlogsCollection.findOne(query);
      res.send(result);
    });

    // using query for specific users blog show
    app.get("/my_blogs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await BlogsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/post_blog", async (req, res) => {
      const data = req?.body;
      const result = await BlogsCollection.insertOne(data);
      res.send(result);
    });

    app.delete("/delete_blog/:id", async (req, res) => {
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
          blogName: data?.blogName,
        },
      };
      const result = await BlogsCollection.updateOne(query, updatedData);
      res.send(result);
    });
    // blogs end here

    // connecting people start
    app.put('/following/:id', async (req, res) => {
      const data = req?.body
      const followingId = req?.params?.id;
      const followedId = data?._id;
      // following peopleId 
      const query1 = { _id: new ObjectId(followingId) }
      // followed people id 
      const query2 = { _id: new ObjectId(followedId) }
      console.log(query1, query2);
      // updated in following backend 
      const updatedFollowing = {
        $push: { following: followedId }
      };
      // updated in  followed backend
      const updatedFollowed = {
        $push: { followed: followingId }
      };
      // result for following 
      const followingResult = await UsersCollection.updateOne(query1, updatedFollowing)
      // result for followed
      const followedResult = await UsersCollection.updateOne(query2, updatedFollowed)
      res.send({ followingResult, followedResult })
    })
    app.put('/unfollowing/:id', async (req, res) => {
      const data = req?.body
      const followingId = req?.params?.id;
      const followedId = data?._id;
      // following peopleId 
      const query1 = { _id: new ObjectId(followingId) }
      // followed people id 
      const query2 = { _id: new ObjectId(followedId) }
      console.log(query1, query2);
      const removeFromFollowing = {
        $pull: { following: followedId }
      };
      const removeFromFollowed = {
        $pull: { followed: followingId }
      };
      // result for following 
      const unfollowingResult = await UsersCollection.updateOne(query1, removeFromFollowing)
      // result for followed
      const unfollowedResult = await UsersCollection.updateOne(query2, removeFromFollowed)
      res.send({ unfollowingResult, unfollowedResult })
    })
    app.get('/get_following_and_follower/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await UsersCollection.findOne(query);
      const followingId = (result?.following || []).map(id => new ObjectId(id));
      const followedId = (result?.followed || []).map(id => new ObjectId(id));
      const followingMembers = await UsersCollection.find({ _id: { $in: followingId } }).toArray()
      const followedMembers = await UsersCollection.find({ _id: { $in: followedId } }).toArray()
      // console.log(followingMembers,followedMembers);
      res.send({ followingMembers, followedMembers })
    })
    // connecting people end

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
