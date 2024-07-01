import User from "../schema/User.js";
import bcrypt from "bcrypt";

let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

export const searchUsers = async (req, res) => {
  let { query } = req.body;
  try {
    const users = await User.find({
      "personal_info.username": new RegExp(query, "i"),
    })
      .limit(50)
      .select(
        "personal_info.fullname personal_info.username personal_info.profile_img -_id"
      );

    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getProfile = async (req, res) => {
  const { username } = req.body;
  try {
    const user = await User.findOne({
      "personal_info.username": username,
    }).select("-personal_info.password -google_auth -updatedAt -blogs");
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const changePassword = (req, res) => {
  let { currentPassword, newPassword } = req.body;

  if (
    !passwordRegex.test(currentPassword) ||
    !passwordRegex.test(newPassword)
  ) {
    return res.status(403).json({
      error:
        "Password must contain at least one numeric digit, one uppercase and one lowercase letter, and be 6-20 characters long",
    });
  }

  User.findOne({ _id: req.user })
    .then((user) => {
      if (user.google_auth) {
        return res.status(403).json({
          error:
            "You can't change account's password because  you logged through google account",
        });
      }
      bcrypt.compare(
        currentPassword,
        user.personal_info.password,
        (err, result) => {
          if (err) {
            return res.status(500).json({
              error:
                "Some error occured while changing password, please try later",
            });
          }

          if (!result) {
            return res
              .status(403)
              .json({ error: "Incorrect current password" });
          }

          bcrypt.hash(newPassword, 10, (err, hashed_password) => {
            User.findOneAndUpdate(
              { _id: req.user },
              { "personal_info.password": hashed_password }
            )
              .then((user) => {
                return res.status(200).json({ status: "password changed" });
              })
              .catch((err) => {
                return res.status(500).json({
                  error:
                    "Some error occured while saving new password. please try later",
                });
              });
          });
        }
      );
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({
        error: "user not found",
      });
    });
};

export const updateProfileImage = (req, res) => {
  let { url } = req.body;
  console.log(url);
  User.findOneAndUpdate({ _id: req.user }, { "personal_info.profile_img": url })
    .then((user) => {
      return res.status(200).json({ profile_img: url });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

export const updateProfile = (req, res) => {
  let { username, bio, social_links } = req.body;
  let bioLimit = 150;

  if (username.length < 3) {
    return res
      .status(403)
      .json({ error: "Username should be al least 3 letters long" });
  }

  if (bio.length > bioLimit) {
    return res
      .status(403)
      .json({ error: `Bio should be not more then ${bioLimit}` });
  }

  let socialLinkArr = Object.keys(social_links);

  try {
    for (let i = 0; i < socialLinkArr.length; i++) {
      if (social_links[socialLinkArr[i]].length) {
        let hostname = new URL(social_links[socialLinkArr[i]]).hostname;

        if (
          !hostname.includes(`${socialLinkArr[i]}.com`) &&
          socialLinkArr[i] != "website"
        ) {
          return res.status(403).json({
            error: `${socialLinkArr[i]} link invalid, You must be enter full link`,
          });
        }
      }
    }
  } catch (error) {
    return res.status(500).json({
      error: "You must provide full social links with http(s) included",
    });
  }

  let updateObj = {
    "personal_info.username": username,
    "personal_info.bio": bio,
    social_links,
  };

  User.findOneAndUpdate({ _id: req.user }, updateObj, { runValidators: true })
    .then(() => {
      return res.status(200).json({ username });
    })
    .catch((err) => {
      if (err.code == 11000) {
        return res.status(409).json({ error: "username is alredy taken" });
      }
      return res.status(500).json({ error: err.message });
    });
};
