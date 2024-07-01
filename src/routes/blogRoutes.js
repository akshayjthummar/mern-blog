import express from "express";
import {
  SearchBlogsCount,
  allLatestBlogsCount,
  createBlogController,
  getBlog,
  latestBlogController,
  searchByCategoryBlogController,
  trandingBlogController,
  likeBlog,
  isLikeByUser,
  addComment,
  getBlogComments,
  getReplies,
  deleteComments,
  newNotification,
  notifications,
  allNotifications,
  userWrittenBlogs,
  userWrittenBlogsCount,
  deleteBlog,
} from "../controllers/blogControllers.js";
import { verifyJWT } from "../middleware/middleware.js";

const router = express.Router();

router.post("/create-blog", verifyJWT, createBlogController);
router.post("/latest-blogs", latestBlogController);
router.get("/tranding-blogs", trandingBlogController);
router.post("/search-blogs", searchByCategoryBlogController);
router.post("/all-latest-blogs-count", allLatestBlogsCount);
router.post("/search-blogs-count", SearchBlogsCount);
router.post("/get-blog", getBlog);
router.post("/like-blog", verifyJWT, likeBlog);
router.post("/isLike-by-user", verifyJWT, isLikeByUser);
router.post("/add-comment", verifyJWT, addComment);
router.post("/get-blog-comments", getBlogComments);
router.post("/get-replies", getReplies);
router.post("/delete-comments", verifyJWT, deleteComments);
router.get("/new-notification", verifyJWT, newNotification);
router.post("/notifications", verifyJWT, notifications);
router.post("/all-notifications-count", verifyJWT, allNotifications);
router.post("/user-written-blogs", verifyJWT, userWrittenBlogs);
router.post("/user-written-blogs-count", verifyJWT, userWrittenBlogsCount);
router.post("/delete-blog", verifyJWT, deleteBlog);

export default router;
