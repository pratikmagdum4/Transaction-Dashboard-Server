const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const transactionRoutes = require("./routes/transactionRoutes.js");
const { initializeDatabase } = require("./controller/transactionController"); // Import initialize function

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

mongoose
  .connect("mongodb://localhost:27017/mern-challenge", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connected to MongoDB");

    // Initialize the database with seed data
    console.log("Initializing database with seed data...");
    try {
      await initializeDatabase(); // No need to pass req and res, as we're not handling a request here
      console.log("Database initialized successfully!");
    } catch (error) {
      console.error("Error initializing the database:", error);
    }
  })
  .catch((error) => console.error("Error connecting to MongoDB:", error));

app.use("/api", transactionRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Hello from server" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
