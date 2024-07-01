import bcrypt from "bcrypt";
import User from "../schema/User.js";
import { getAuth } from "firebase-admin/auth";
import { formatDatatoSend, generatUsername } from "../utils/utils.js";

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

export const signupController = async (req, res) => {
  const { fullname, email, password } = req.body;

  if (fullname.length < 3) {
    return res.status(403).json({ error: "Fullname must be 3 letters long" });
  }

  if (!email.length) {
    return res.status(403).json({ error: "Enter email" });
  }

  if (!emailRegex.test(email)) {
    return res.status(403).json({ error: "Email is invalid" });
  }

  if (!passwordRegex.test(password)) {
    return res.status(403).json({
      error:
        "It should be between 6 and 20 characters in length, at least one character must be numeric, it must contain at least one lowercase letter, and it must contain at least one uppercase letter",
    });
  }

  try {
    const existingUser = await User.findOne({ "personal_info.email": email });
    if (existingUser) {
      return res.status(403).json({ error: "Email already in use" });
    }

    const hashed_password = await bcrypt.hash(password, 10);
    const username = await generatUsername(email);
    const user = new User({
      personal_info: {
        fullname,
        email,
        password: hashed_password,
        username,
      },
    });

    const savedUser = await user.save();
    return res.status(200).json(formatDatatoSend(savedUser));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const signinController = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ "personal_info.email": email });

    if (!user) {
      return res.status(403).json({ error: "Email not found" });
    }

    if (!user.google_auth) {
      const isMatch = await bcrypt.compare(
        password,
        user.personal_info.password
      );
      if (!isMatch) {
        return res.status(403).json({ error: "Invalid password" });
      }

      return res.status(200).json(formatDatatoSend(user));
    } else {
      return res.status(403).json({
        error: "Account was created using google, Try login with google",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const googleAuthController = async (req, res) => {
  try {
    const { access_token } = req.body;
    const decodedUser = await getAuth().verifyIdToken(access_token);
    const { email, name, picture } = decodedUser;

    const updatedPicture = picture.replace("s96-c", "s384-c");

    let user;
    try {
      user = await User.findOne({ "personal_info.email": email })
        .select(
          "personal_info.fullname personal_info.username personal_info.profile_img google_auth"
        )
        .exec();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }

    if (user) {
      // login
      if (!user.google_auth) {
        return res.status(403).json({
          error:
            "This email is signed up without Google. Please log in with a password to access.",
        });
      }
    } else {
      // signup
      const username = await generatUsername(email);
      user = new User({
        personal_info: {
          fullname: name,
          email,
          profile_img: updatedPicture,
          username,
        },
        google_auth: true,
      });

      try {
        await user.save();
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }

    return res.status(200).json(formatDatatoSend(user));
  } catch (error) {
    return res.status(500).json({
      error: "Failed to authenticate with Google, try another email.",
    });
  }
};
