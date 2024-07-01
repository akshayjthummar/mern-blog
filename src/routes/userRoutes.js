import { Router } from "express";
import {
  searchUsers,
  getProfile,
  changePassword,
  updateProfileImage,
  updateProfile,
} from "../controllers/userControllers.js";
import { verifyJWT } from "../middleware/middleware.js";

const router = Router();

router.post("/search-users", searchUsers);
router.post("/get-profile", getProfile);
router.post("/change-password", verifyJWT, changePassword);
router.post("/update-profile-image", verifyJWT, updateProfileImage);
router.post("/update-profile", verifyJWT, updateProfile);

export default router;
