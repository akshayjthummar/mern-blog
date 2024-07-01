import express from "express";
import {
  googleAuthController,
  signinController,
  signupController,
} from "../controllers/authControllers.js";

const router = express.Router();

router.post("/signup", signupController);
router.post("/signin", signinController);
router.post("/google-auth", googleAuthController);

export default router;
