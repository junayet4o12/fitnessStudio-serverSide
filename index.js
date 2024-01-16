const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const app = express();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Fitness is running...");
  });
  
  app.listen(port, () => {
    console.log(`Fitness is Running on port ${port}`);
  });