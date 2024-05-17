const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();

const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const queryString = require("querystring");
const axiosSecure = require("./axiosSecure");
const { TIMEOUT } = require("dns");
const frontendUrl = "http://localhost:5173";
// const frontendUrl = "https://fitness-studio.surge.sh"

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
    const QuoteCollections = FitnessStudio.collection("QuoteCollection");
    const BlogsCollection = FitnessStudio.collection("Blogs_Collections");
    const UserMessagesCollection = FitnessStudio.collection(
      "UserMessages_Collections"
    );
    const ProductsCollection = FitnessStudio.collection("Products_Collections");
    const EventsCollection = FitnessStudio.collection("Events_Collections");
    const HelpCollection = FitnessStudio.collection("Help_Collection");
    const EventsBookingCollection = FitnessStudio.collection(
      "Events_Booking_Collections"
    );
    const donationCollection = FitnessStudio.collection("Donation_Collection");
    const NotificationCollection = FitnessStudio.collection(
      "Notification_Collection"
    );

    // verify Admin  start
    const verifyadmin = async (req, res, next) => {
      const email = req?.user?.email;
      const query = { email: email };
      const user = await UsersCollection.findOne(query);
      const isadmin = user?.admin === true;
      if (!isadmin) {
        return res.status(403).send({ message: "forbidden" });
      }

      next();
    };
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

    // strava started

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
          // secure: process.env.NODE_ENV === "production" ? true : false,
          // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ setToken: "success" });
    });

    app.post("/logout", async (req, res) => {
      res
        .cookie("token", "", {
          expires: new Date(0),
          httpOnly: true,
          // secure: process.env.NODE_ENV === "production" ? true : false,
          // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ message: "logged out Successfully" });
    });

    //Payments starts Here

    app.post("/payments", async (req, res) => {
      const paymentInfo = req.body;
      const result = await donationCollection.insertOne(paymentInfo);
      res.send(result);
    });
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;

      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // Payments ends Here

    //Notification center starts

    app.post("/notifications", async (req, res) => {
      const data = req.body;
      const result = await NotificationCollection.insertOne(data);
      res.send(result);
    });
    app.get("/notifications", async (req, res) => {
      const result = await NotificationCollection.find()
        .sort({ time: -1 })
        .limit(200)
        .toArray();
      res.send(result);
    });

    //Notification center ends
    // feedback start

    app.get("/feedback", async (req, res) => {
      const result = await FeedbackCollection.find()
        .sort({ time: -1 })
        .limit(10)
        .toArray();
      res.send(result);
    });
    app.post("/send_feedback", async (req, res) => {
      const data = req.body;
      const result = await FeedbackCollection.insertOne(data);
      res.send(result);
    });
    app.get("/feedback", async (req, res) => {
      const result = await FeedbackCollection.find()
        .sort({ time: -1 })
        .toArray();
      res.send(result);
    });

    // feedback end
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

    app.post("/user_goal", async (req, res) => {
      const goalInfo = req.body;
      const result = await UserGoalCollection.insertOne(goalInfo);
      res.send(result);
    });

    app.delete("/user_goal/:id", async (req, res) => {
      const id = req.params.id;
      console.log("delete", id);
      const query = {
        _id: new ObjectId(id),
      };
      const result = await UserGoalCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    app.put("/user_goal/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      console.log("id", id, data);
      const filter = { _id: new ObjectId(id) };
      const filter2 = { email: data?.email };
      let updatedUserGoal = {};

      // Strength training goal update starts here

      if (data?.tracking_goal === "Strength_training") {
        console.log("the whole object is", data);
        const options = { upsert: true };
        if (parseInt(data?.target1Rm) <= data?.new_current1rm) {
          console.log("strength training goal completed");
          updatedUserGoal = {
            $set: {
              new_current1rm: data?.new_current1rm,
              completed: true,
              completed_time: new Date().getTime(),
            },
          };
        } else {
          updatedUserGoal = {
            $set: {
              new_current1rm: data?.new_current1rm,
            },
          };
          console.log("current covered distance", updatedUserGoal);
        }
        const result = await UserGoalCollection.updateOne(
          filter,
          updatedUserGoal,
          options
        );
        res.send(result);
      }

      // Strength training goal update ends here

      // Endurance Goal update starts
      else if (data?.tracking_goal === "Endurance") {
        const options = { upsert: true };
        if (data?.current_distance >= data?.distance) {
          console.log("Endurance goal completed");
          updatedUserGoal = {
            $set: {
              current_distance: data?.current_distance,
              completed: true,
              completed_time: new Date().getTime(),
            },
          };
        } else {
          updatedUserGoal = {
            $set: {
              current_distance: data?.current_distance,
            },
          };
          console.log("current covered distance", updatedUserGoal);
        }
        const result = await UserGoalCollection.updateOne(
          filter,
          updatedUserGoal,
          options
        );
        res.send(result);
      }

      // Endurance Goal update end

      // Weight management goal update start
      else {
        const updatedUserGoal2 = {
          $set: {
            weight: data.current_weight,
          },
        };
        const options = { upsert: true };
        console.log(
          "data is",
          data?.goalType,
          data?.targetWeight,
          data.current_weight
        );
        if (
          data?.goalType == "gainWeight" &&
          data?.targetWeight <= data.current_weight
        ) {
          console.log("Completed");
          updatedUserGoal = {
            $set: {
              current_weight: data.current_weight,
              completed: true,
              completed_time: new Date().getTime(),
            },
          };
        } else if (
          data?.goalType == "lossWeight" &&
          data?.targetWeight >= data.current_weight
        ) {
          console.log("Completed");
          updatedUserGoal = {
            $set: {
              current_weight: data.current_weight,
              completed: true,
              completed_time: new Date().getTime(),
            },
          };
        } else {
          console.log("incompleted");
          updatedUserGoal = {
            $set: {
              current_weight: data.current_weight,
            },
          };
        }

        console.log("current weight", updatedUserGoal);
        const result = await UserGoalCollection.updateOne(
          filter,
          updatedUserGoal,
          options
        );
        const result2 = await UsersCollection.updateOne(
          filter2,
          updatedUserGoal2,
          options
        );
        res.send(result);
      }
    });
    // Weight management goal update ends

    // Quote related api starts here
    app.get("/quotes", async (req, res) => {
      const result = await QuoteCollections.find().toArray();
      res.send(result);
    });
    // Quote related api ends here

    app.get("/user_goal/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      if (email !== req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      } else {
        const query = { user_email: email, completed: false };
        const result = await UserGoalCollection.find(query)
          .sort({ _id: -1 })
          .toArray();
        res.send(result);
      }
    });
    app.get("/user_completed_goal/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      if (email !== req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      } else {
        const query = { user_email: email, completed: true };
        const result = await UserGoalCollection.find(query).toArray();
        res.send(result);
      }
    });
    app.get(
      "/user_completed_goal_count/:email",
      verifyToken,
      async (req, res) => {
        const email = req.params.email;
        console.log(email);
        if (email !== req.user.email) {
          return res.status(403).send({ message: "forbidden" });
        } else {
          const query = { user_email: email, completed: true };
          const result = await UserGoalCollection.find(query).toArray();
          res.send({ completedGoal: result?.length });
        }
      }
    );

    app.get("/user", async (req, res) => {
      const email = req.query.email;
      let query = {};

      if (req.query.email) {
        query = { email: email };
      }

      const result = await UsersCollection.findOne(query);
      res.send(result);
    });
    app.get("/all_Users", async (req, res) => {
      const result = await UsersCollection.find().toArray();
      res.send(result);
    });
    app.get("/users", verifyToken, async (req, res) => {
      const name = req.query.name;
      const page = req.query.page;
      const size = req.query.size;
      let query = {};
      if (req.query.name) {
        query = {
          name: { $regex: name, $options: "i" },
        };
      }
      const result = await UsersCollection.find(query)
        .skip(parseInt(size * page))
        .limit(parseInt(size))
        .toArray();
      res.send(result);
    });
    app.get("/search_people/:name", verifyToken, async (req, res) => {
      const name = req.params.name;
      let query = {};
      if (req.params.name) {
        query = {
          name: { $regex: name, $options: "i" },
        };
      }

      const result = await UsersCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/random_people", verifyToken, async (req, res) => {
      const result = await UsersCollection.find().toArray();
      const randomNumber = Math.floor(Math.random() * result.length);
      const result2 = result.slice(randomNumber, randomNumber + 4);
      res.send(result2);
    });

    app.get("/usersCount", verifyToken, async (req, res) => {
      const count = await UsersCollection.estimatedDocumentCount();
      res.send({ count });
    });

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
    app.put("/make-user/:email", verifyToken, verifyadmin, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const updatedRole = {
        $set: {
          role: "user",
        },
      };
      const result = await UsersCollection.updateOne(query, updatedRole);
      res.send(result);
    });

    // Users Delete
    app.delete("/users/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await UsersCollection.deleteOne(query);
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
    app.get("/single_user/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await UsersCollection.findOne(query);
      res.send(result);
    });

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
    app.get("/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const query = { email: email };
      const user = await UsersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.admin === true;
      }
      res.send({ admin });
    });
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

      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log(page);
      console.log(size);
      const result = await BlogsCollection.find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/blogcount", async (req, res) => {
      const count = await BlogsCollection.estimatedDocumentCount();
      res.send({ count });
    });

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
      console.log(query);
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
      // console.log(id);
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
    app.put("/following/:id", async (req, res) => {
      const data = req?.body;
      const followingId = req?.params?.id;
      const followedId = data?._id;
      const time = new Date().getTime();
      const followedTime = { time: time, followedId: followingId };
      console.log("I want to give follow", followingId, followedTime);
      // following peopleId
      const query1 = { _id: new ObjectId(followingId) };
      // followed people id
      const query2 = { _id: new ObjectId(followedId) };
      console.log(query1, query2);
      // updated in following backend
      const updatedFollowing = {
        $push: { following: followedId },
      };
      // updated in  followed backend
      const updatedFollowed = {
        $push: { followed: followingId, followedTime: followedTime },
      };
      // result for following
      const followingResult = await UsersCollection.updateOne(
        query1,
        updatedFollowing
      );
      // result for followed
      const followedResult = await UsersCollection.updateOne(
        query2,
        updatedFollowed
      );
      res.send({ followingResult, followedResult });
    });
    app.put("/unfollowing/:id", async (req, res) => {
      const data = req?.body;
      const followingId = req?.params?.id;
      const followedId = data?._id;
      // following peopleId
      const query1 = { _id: new ObjectId(followingId) };
      // followed people id
      const query2 = { _id: new ObjectId(followedId) };
      console.log(query1, query2);
      const removeFromFollowing = {
        $pull: { following: followedId },
      };
      const removeFromFollowed = {
        $pull: { followed: followingId },
      };

      // result for following

      const unfollowingResult = await UsersCollection.updateOne(
        query1,
        removeFromFollowing
      );
      // result for followed
      const unfollowedResult = await UsersCollection.updateOne(
        query2,
        removeFromFollowed
      );
      res.send({ unfollowingResult, unfollowedResult });
    });

    app.get("/following_users_blog/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await UsersCollection.findOne(query);

        if (!result) {
          return res.status(404).json({ message: "User not found" });
        }
        const followingUsersBlogs = await BlogsCollection.find({
          userId: { $in: result.following || [] },
        }).toArray();
        res.send(followingUsersBlogs);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
      }
    });
    // connecting people end

    app.get("/get_following_and_follower/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await UsersCollection.findOne(query);
      const followingId = (result?.following || []).map(
        (id) => new ObjectId(id)
      );
      const followedId = (result?.followed || []).map((id) => new ObjectId(id));
      const followingMembers = await UsersCollection.find({
        _id: { $in: followingId },
      }).toArray();
      const followedMembers = await UsersCollection.find({
        _id: { $in: followedId },
      }).toArray();
      // console.log(followingMembers,followedMembers);
      res.send({ followingMembers, followedMembers });
    });
    // connecting people end

    // products section started

    // getting the products
    app.get("/products", async (req, res) => {
      const email = req.query.email;
      const verify = req.query.verify;
      const sold = req.query.sold;
      let query = {};
      if (req.query.email && req.query.verify) {
        query = { sellerEmail: email, verify: verify };
      } else if (req.query.email) {
        query = { sellerEmail: email };
      } else if (req.query.verify) {
        query = { verify: verify };
      } else if (req.query.sold) {
        query = { sold: sold };
      }
      const result = await ProductsCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

    //only one users liveproducts
    // app.get("/usersproduct", async(req, res)=>{
    //   const email = req.query.email
    //   const verify = req.query.verify
    //   let query1 = {}
    //   let query2 = {}
    //   if(req.query.email && req.query.verify){
    //     console.log(req.query.email);
    //     console.log(req.query.verify);
    //   }
    //   const result = await ProductsCollection.find(query).toArray()
    //   res.send(result)
    // })

    // product my id
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ProductsCollection.findOne(query);
      res.send(result);
    });
    // postiong the products
    app.post("/products", async (req, res) => {
      const data = req.body;
      const result = await ProductsCollection.insertOne(data);
      res.send(result);
    });

    // lets verify the product
    app.post("/product/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const vefify = "verified";
      const product = {
        $set: {
          verify: vefify,
        },
      };
      const result = await ProductsCollection.updateOne(
        filter,
        product,
        option
      );
      res.send(result);
    });

    // Marking sold products
    app.post("/sold_product/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const sold = "sold";
      // const updateProduct = req.body
      const product = {
        $set: {
          sold: sold,
        },
      };
      const result = await ProductsCollection.updateOne(
        filter,
        product,
        option
      );
      res.send(result);
    });

    // updating or modifing a product
    app.post("/updateProduct/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateProduct = req.body;
      const product = {
        $set: {
          Pname: updateProduct.Pname,
          Pprice: updateProduct.Pprice,
          Pquantity: updateProduct.Pquantity,
          Pdescription: updateProduct.Pdescription,
          imgUrl: updateProduct.imgUrl,
          PPhone: updateProduct.PPhone,
          PEmail: updateProduct.PEmail,
        },
      };
      const result = await ProductsCollection.updateOne(
        filter,
        product,
        option
      );
      res.send(result);
    });

    //product deletiong
    app.get("/Delproduct/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await ProductsCollection.deleteOne(filter);
      res.send(result);
    });

    // products section ended

    // message endpoint start
    app.post("/send_message", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await UserMessagesCollection.insertOne(data);
      res.send(result);
    });
    app.get("/all_message", async (req, res) => {
      const result = await UserMessagesCollection.find().toArray();
      res.send(result);
    });
    app.get("/message_with_friend", async (req, res) => {
      const { you, friend } = req?.query;
      // console.log(you, friend);
      const query = {
        $or: [
          { sender: you, receiver: friend },
          { sender: friend, receiver: you },
        ],
      };
      const result = await UserMessagesCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/unread_message", async (req, res) => {
      const { you, friend } = req?.query;
      // console.log(you, friend);
      const query = { sender: friend, receiver: you, seen: false };
      // console.log('inline 951',query);
      const result = await UserMessagesCollection.find(query).toArray();
      res.send({ count: result.length });
    });
    app.get("/all_unread_message_count", async (req, res) => {
      const { you } = req?.query;
      console.log(you);
      const query = { receiver: you, seen: false };
      console.log(query);
      const result = await UserMessagesCollection.find(query).toArray();
      let newArray = result.filter((arr) => arr.sender && arr.receiver);
      console.log(newArray.length, result.length);

      res.send({ count: newArray.length, result: newArray });
    });
    app.put("/read_message", async (req, res) => {
      const { you, friend } = req?.query;
      // console.log(you, friend);
      const query = { sender: friend, receiver: you, seen: false };
      const updatedData = {
        $set: {
          seen: true,
        },
      };
      const result = await UserMessagesCollection.updateMany(
        query,
        updatedData
      );
      res.send(result);
    });
    // message endpoint end
    //help endpoint started
    app.get("/help", async (req, res) => {
      const verify = req.query.verify;
      let query = {};
      if (req.query.verify) {
        query = { verify: verify };
      }

      const result = await HelpCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/help/:id", async (req, res) => {
      const id = req.params.id;
      const filter = new ObjectId(id);
      const result = await HelpCollection.find(filter).toArray();
      res.send(result);
    });

    app.post("/help/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const vefify = "verified";
      const product = {
        $set: {
          verify: vefify,
        },
      };
      const result = await HelpCollection.updateOne(filter, product, option);
      res.send(result);
    });
    app.post("/help", async (req, res) => {
      const data = req.body;
      const result = await HelpCollection.insertOne(data);
      res.send(result);
    });

    app.get("/DeleteHelp/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await HelpCollection.deleteOne(filter);
      res.send(result);
    });
    // Help collection starts

    app.put("/help/update/:id", verifyToken, async (req, res) => {
      const id = req.params;
      const { donatedAmount } = req.body;
  
      const filter = { _id: new ObjectId(id) };
      const existingHelp = await HelpCollection.findOne(filter)
      const currentraised = existingHelp.Raised
      const updatedRaisedAmount = currentraised + donatedAmount;
      console.log(currentraised);

      const updatedDoc = {
        $inc: {
          donated_amount: donatedAmount,
        },
        $set: {
          Raised:   updatedRaisedAmount,
        }
      };
      const result = await HelpCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // Help collection ends

    //help endpoint ended
    // event api start
    app.get("/all_event", async (req, res) => {
      const result = await EventsCollection.find().toArray();
      res.send(result);
    });
    app.get("/all_event/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await EventsCollection.findOne(query);
      res.send(result);
    });
    app.get("/events_booking/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { user_email: email };
      const result = await EventsBookingCollection.find(filter).toArray();
      res.send(result);
    });
    app.post("/all_event", async (req, res) => {
      const data = req.body;
      const result = await EventsCollection.insertOne(data);
      res.send(result);
    });
    app.post("/events_booking", async (req, res) => {
      const data = req.body;
      const result = await EventsBookingCollection.insertOne(data);
      res.send(result);
    });
    app.delete("/cancel_booking/:id", async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await EventsBookingCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/all_event/:id", async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await EventsCollection.deleteOne(query);
      res.send(result);
    });
    app.put("/update_event/:id", async (req, res) => {
      const updateInfo = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          event_name: updateInfo.event_name,
          event_description: updateInfo.event_description,
          event_image: updateInfo.event_image,
          event_price: updateInfo.event_price,
          event_tickets: updateInfo.event_tickets,
          event_start_date: updateInfo.event_start_date,
          event_start_end: updateInfo.event_start_end,
        },
      };
      const result = await EventsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.put("/event_booking_update/:id", async (req, res) => {
      const updateInfo = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          event_tickets: updateInfo.event_tickets,
        },
      };
      const result = await EventsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // event api end

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
