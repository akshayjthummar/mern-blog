import { nanoid } from "nanoid";
import Blog from "../schema/Blog.js";
import User from "../schema/User.js";
import Notification from "../schema/Notification.js";
import Comment from "../schema/Comment.js";

export const latestBlogController = (req, res) => {
  const { page } = req.body;
  const maxLimit = 5;
  Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((error) => {
      return res.status(500).json({ error: error.message });
    });
};

export const trandingBlogController = (req, res) => {
  Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .sort({
      "activity.total_reads": -1,
      "activity.total_likes": -1,
      publishedAt: -1,
    })
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((error) => {
      return res.status(500).json({ error: error.message });
    });
};

export const searchByCategoryBlogController = (req, res) => {
  const { tag, query, author, page, limit, eliminate_blog } = req.body;
  let findQuery;
  if (tag) {
    findQuery = { tags: tag, draft: false, blog_id: { $ne: eliminate_blog } };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") };
  } else if (author) {
    findQuery = { draft: false, author };
  }
  const maxLimit = limit ? limit : 2;
  Blog.find(findQuery)
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((error) => {
      return res.status(500).json({ error: error.message });
    });
};

export const SearchBlogsCount = (req, res) => {
  const { tag, author, query } = req.body;
  let findQuery;
  if (tag) {
    findQuery = { tags: tag, draft: false };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") };
  } else if (author) {
    findQuery = { draft: false, author };
  }
  Blog.countDocuments(findQuery)
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((error) => {
      return res.status(500).json({ error: error.message });
    });
};

export const allLatestBlogsCount = (req, res) => {
  Blog.countDocuments({ draft: false })
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
};

export const createBlogController = (req, res) => {
  let authorId = req.user;
  let isAdmin = req.admin;
  if (isAdmin) {
    let { title, des, banner, content, tags, draft, id } = req.body;

    if (!title.length) {
      return res.status(403).json({ error: "You must provide a title " });
    }

    if (!draft) {
      if (!des.length || des.length > 200) {
        return res.status(403).json({
          error: "You must provide blog description under 200 characters",
        });
      }
      if (!banner.length) {
        return res.status(403).json({
          error: "You must provide a blog banner to publish the blog",
        });
      }
      if (!content.blocks.length) {
        return res
          .status(403)
          .json({ error: "There must be some blog content to publish it" });
      }
      if (!tags.length || tags.length > 10) {
        return res
          .status(403)
          .json({ error: "Provide tags in order to publish blog, maximum 10" });
      }
    }

    tags = tags.map((tag) => tag.toLowerCase());

    let blog_id =
      id || title.replace(/[^a-zA-Z0-9]/g, " ").replace(/\s+/g, "-") + nanoid();
    if (id) {
      Blog.findOneAndUpdate(
        { blog_id },
        {
          title,
          des,
          banner,
          content,
          tags,
          draft: draft ? draft : false,
        }
      )
        .then(() => {
          return res.status(200).json({ id: blog_id });
        })
        .catch((error) => {
          return res.status(500).json({ error: error.message });
        });
    } else {
      let blog = new Blog({
        title,
        des,
        banner,
        content,
        tags,
        author: authorId,
        blog_id,
        draft: Boolean(draft),
      });

      blog
        .save()
        .then((data) => {
          let incrementVal = draft ? 0 : 1;
          return User.findOneAndUpdate(
            { _id: authorId },
            {
              $inc: { "account_info.total_posts": incrementVal },
              $push: { blogs: blog._id },
            }
          );
        })
        .then((user) => {
          return res.status(200).json({ id: blog.blog_id });
        })
        .catch((error) => {
          return res
            .status(500)
            .json({ error: error.message || "An error occurred" });
        });
    }
  } else {
    return res
      .status(500)
      .json({ error: "You don't have permissions to create blog" });
  }
};

export const getBlog = async (req, res) => {
  const { blog_id, draft, mode } = req.body;
  const incrementVal = mode != "edit" ? 1 : 0;
  try {
    const blog = await Blog.findOneAndUpdate(
      { blog_id },
      { $inc: { "activity.total_reads": incrementVal } }
    )
      .populate(
        "author",
        "personal_info.fullname personal_info.username personal_info.profile_img"
      )
      .select("title des content banner activity publishedAt blog_id tags");
    if (blog.draft && !draft) {
      return res.status(500).json({ error: "You can not access draft blog" });
    }
    await User.findOneAndUpdate(
      { "personal_info.username": blog.author.personal_info.username },
      { $inc: { "account_info.total_reads": incrementVal } }
    );
    return res.status(200).json({ blog });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const likeBlog = async (req, res) => {
  const user_id = req.user;
  const { _id, isLikeByUser } = req.body;
  const incrementVal = !isLikeByUser ? 1 : -1;
  try {
    const blog = await Blog.findOneAndUpdate(
      { _id },
      { $inc: { "activity.total_likes": incrementVal } }
    );
    if (!isLikeByUser) {
      const like = new Notification({
        type: "like",
        blog: _id,
        notification_for: blog.author,
        user: user_id,
      });
      like.save().then((notification) => {
        return res.status(200).json({ liked_by_user: true });
      });
    } else {
      Notification.findOneAndDelete({ user: user_id, blog: _id, type: "like" })
        .then((data) => {
          return res.status(200).json({ liked_by_user: false });
        })
        .catch((error) => {
          return res.status(500).json({ error: error.message });
        });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const isLikeByUser = async (req, res) => {
  const user_id = req.user;
  const { _id } = req.body;
  try {
    const result = await Notification.exists({
      user: user_id,
      type: "like",
      blog: _id,
    });
    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const addComment = (req, res) => {
  const user_id = req.user;
  let { _id, comment, blog_author, replying_to, notification_id } = req.body;

  if (!comment.length) {
    return res
      .status(400)
      .json({ error: "Write something to leave a comment" });
  }

  // creting comment docs
  const commentObj = {
    blog_id: _id,
    blog_author,
    comment,
    commented_by: user_id,
  };

  if (replying_to) {
    commentObj.parent = replying_to;
    commentObj.isReply = true;
  }

  new Comment(commentObj).save().then(async (commentFile) => {
    let { comment, commentedAt, children } = commentFile;

    Blog.findOneAndUpdate(
      { _id },
      {
        $push: {
          comments: commentFile._id,
        },
        $inc: {
          "activity.total_comments": 1,
          "activity.total_parent_comments": replying_to ? 0 : 1,
        },
      }
    ).then((blog) => {
      console.log("New Comment created");
    });

    let notificationObj = {
      type: replying_to ? "reply" : "comment",
      blog: _id,
      notification_for: blog_author,
      user: user_id,
      comment: commentFile._id,
    };

    if (replying_to) {
      notificationObj.replied_on_comment = replying_to;
      await Comment.findOneAndUpdate(
        { _id: replying_to },
        { $push: { children: commentFile._id } }
      ).then((replyToCommentDoc) => {
        notificationObj.notification_for = replyToCommentDoc.commented_by;
      });
      if (notification_id) {
        Notification.findOneAndUpdate(
          { _id: notification_id },
          { reply: commentFile._id }
        ).then((notification) => console.log("notification updatd"));
      }
    }

    new Notification(notificationObj).save().then((notification) => {
      console.log("new notification created");
    });

    return res
      .status(200)
      .json({ comment, commentedAt, _id: commentFile._id, user_id, children });
  });
};

export const getBlogComments = (req, res) => {
  let { blog_id, skip } = req.body;
  let maxLimit = 5;

  Comment.find({ blog_id, isReply: false })
    .populate(
      "commented_by",
      "personal_info.username personal_info.fullname personal_info.profile_img"
    )
    .skip(skip)
    .limit(maxLimit)
    .sort({ commentedAt: -1 })
    .then((comment) => {
      return res.status(200).json(comment);
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

export const getReplies = (req, res) => {
  const { _id, skip } = req.body;
  const maxLimit = 5;
  Comment.findOne({ _id })
    .populate({
      path: "children",
      options: {
        limit: maxLimit,
        skip: skip,
        sort: { commentedAt: -1 },
      },
      populate: {
        path: "commented_by",
        select:
          "personal_info.fullname personal_info.username personal_info.profile_img",
      },
      select: "-blog_id -updatedAt",
    })
    .select("children")
    .then((doc) => {
      return res.status(200).json({ replies: doc.children });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

const deleteComment = (_id) => {
  Comment.findOneAndDelete({ _id })
    .then((comment) => {
      if (comment.parent) {
        Comment.findOneAndUpdate(
          { _id: comment.parent },
          { $pull: { children: _id } }
        )
          .then((data) => console.log("comment delete from parent"))
          .catch((err) => console.log(err));
      }

      Notification.findOneAndDelete({ comment: _id }).then((notification) =>
        console.log("comment notification deleted")
      );

      Notification.findOneAndUpdate(
        { reply: _id },
        { $unset: { reply: 1 } }
      ).then((notification) => console.log("reply notification deleted"));

      Blog.findOneAndUpdate(
        { _id: comment.blog_id },
        {
          $pull: { comments: _id },
          $inc: {
            "activity.total_comments": -1,
            "activity.total_parent_comments": comment.parent ? 0 : -1,
          },
        }
      ).then((blog) => {
        if (comment.children.length) {
          comment.children.map((child) => {
            deleteComment(child);
          });
        }
      });
    })
    .catch((err) => console.log(err.message));
};

export const deleteComments = (req, res) => {
  let user_id = req.user;
  let { _id } = req.body;

  Comment.findOne({ _id }).then((comment) => {
    if (user_id == comment.commented_by || user_id == comment.blog_author) {
      deleteComment(_id);
      return res.status(200).json({ status: "done" });
    } else {
      return res.status(403).json({ error: "You can not delete this comment" });
    }
  });
};

export const newNotification = (req, res) => {
  let user_id = req.user;
  Notification.exists({
    notification_for: user_id,
    seen: false,
    user: { $ne: user_id },
  })
    .then((results) => {
      console.log(results);
      if (results) {
        return res.status(200).json({ new_notification_available: true });
      } else {
        return res.status(200).json({ new_notification_available: false });
      }
    })
    .catch((error) => {
      console.log(error.message);
      return res.status(500).json({ error: error.message });
    });
};

export const notifications = (req, res) => {
  const user_id = req.user;
  const { page, filter, deletedDocCount } = req.body;
  const maxLimit = 10;
  const findQuery = { notification_for: user_id, user: { $ne: user_id } };
  const skipDocs = (page - 1) * maxLimit;

  if (filter != "all") {
    findQuery.type = filter;
  }

  if (deletedDocCount) {
    skipDocs -= deletedDocCount;
  }

  Notification.find(findQuery)
    .skip(skipDocs)
    .limit(maxLimit)
    .populate("blog", "title blog_id")
    .populate(
      "user",
      "personal_info.fullname personal_info.username personal_info.profile_img"
    )
    .populate("comment", "comment")
    .populate("replied_on_comment", "comment")
    .populate("reply", "comment")
    .sort({ createdAt: -1 })
    .select("createdAt type seen reply")
    .then((notifications) => {
      Notification.updateMany(findQuery, { seen: true })
        .skip(skipDocs)
        .limit(maxLimit)
        .then(() => console.log("Notification seened"));
      return res.status(200).json({ notifications });
    })
    .catch((error) => {
      return res.status(500).json({ error: error.message });
    });
};

export const allNotifications = (req, res) => {
  let user_id = req.user;

  let { filter } = req.body;

  let findQuery = { notification_for: user_id, user: { $ne: user_id } };

  if (filter != "all") {
    findQuery.type = filter;
  }

  Notification.countDocuments(findQuery)
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

export const userWrittenBlogs = (req, res) => {
  let user_id = req.user;
  let { page, draft, query, deletedDocCount } = req.body;
  let maxLimit = 5;
  let skipDocs = (page - 1) * maxLimit;

  if (deletedDocCount) {
    skipDocs -= deletedDocCount;
  }

  Blog.find({ author: user_id, draft, title: new RegExp(query, "i") })
    .skip(skipDocs)
    .limit(maxLimit)
    .sort({ publishedAt: -1 })
    .select("title banner publishedAt blog_id activity des draft -_id")
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

export const userWrittenBlogsCount = (req, res) => {
  let user_id = req.user;
  let { draft, query } = req.body;

  Blog.countDocuments({
    author: user_id,
    draft,
    title: new RegExp(query, "i"),
  })
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

export const deleteBlog = (req, res) => {
  const user_id = req.user;
  const isAdmin = req.admin;

  if (isAdmin) {
    const { blog_id } = req.body;
    Blog.findOneAndDelete({ blog_id })
      .then((blog) => {
        Notification.deleteMany({ blog: blog._id }).then(() =>
          console.log("notification deleted")
        );
        Comment.deleteMany({ blog_id: blog._id }).then(() =>
          console.log("comments deleted")
        );
        User.findOneAndUpdate(
          { _id: user_id },
          {
            $pull: { blog: blog._id },
            $inc: { "account_info.total_posts": -1 },
          }
        ).then(() => console.log("blog deleted"));
        return res.status(200).json({ status: "done" });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  } else {
    return res
      .status(500)
      .json({ error: "You don't have permissions to delete blog" });
  }
};
