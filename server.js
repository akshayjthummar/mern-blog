import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import admin from "firebase-admin";

import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };
import { generateUploadUrl } from "./src/utils/awsUpload.js";
import authRoutes from "./src/routes/authRoutes.js";
import blogRoutes from "./src/routes/blogRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";

const app = express();
let PORT = process.env.PORT || 3000;

// Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// JSON & CORS
app.use(express.json());
app.use(cors());

// MongoDB
mongoose.connect(process.env.DB_URL, {
  autoIndex: true,
});

// upload image url routes
app.get("/get-upload-url", (req, res) => {
  generateUploadUrl()
    .then((url) => {
      res.status(200).json({ uploadURL: url });
    })
    .catch((error) => {
      console.log(error.message);
      return res.status(500).json({ error: error.message });
    });
});

// Routes
app.use("/", authRoutes);
app.use("/", blogRoutes);
app.use("/", userRoutes);

// PORT Listrning
app.listen(PORT, () => {
  console.log("listining on port:", PORT);
});
