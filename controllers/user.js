import bcrypt from "bcrypt"
import Jwt from "jsonwebtoken"

import { User } from "../models/user.js"
import { sendWelcomeEmail } from "../utils/emailService.js";

// register : 
export const register = async (req, res) => {

  const { fullName, password, email, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      password: hashedPassword,
      email,
      role
    })

    res.status(201).json(newUser)

    sendWelcomeEmail(newUser);

  } catch (err) {
    // Handle duplicate email errors (Mongo Error Code 11000)
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Server error during registration" });
  }
};

// log in 
export const login = async (req, res) => {

  const { sign } = Jwt
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = sign(
      {
        _id: user._id,
        role: user.role
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' } // Short lived
    );

    const refreshToken = sign(
      {
        _id: user._id
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' } // Long lived
    );

    user.refreshToken = refreshToken;
    user.subscribed = true;
    await user.save();

    res.cookie(
      'accessToken',
      accessToken,
      {
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      });

    res.cookie(
      'refreshToken',
      refreshToken,
      {
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      message: 'Welcome back!',
      user: userResponse
    });

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Something went wrong' });
  }
};

// log out 
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    // Remove refresh token =from the database
    if (refreshToken) {
      await User.findOneAndUpdate(
        { refreshToken: refreshToken },
        { $set: { refreshToken: null } }
      );
    }

    // Clear all auth cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({ message: 'User logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "user not found" });

    res.status(200).json({ message: "user deleted successfully" })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "internal server error" })
  }

};

export const getMyProfile = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "user not found" });

    const userResponse = user.toObject();
    delete userResponse.refreshToken;
    delete userResponse.__v;

    res.status(200).json(userResponse)

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "internal server error" })
  }
}

// Refresh Access Token
export const refresh = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

  try {
    // Verify token
    const decoded = Jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if token exists in DB
    const user = await User.findById(decoded._id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Generate new Access Token
    const newAccessToken = Jwt.sign(
      {
        _id: user._id,
        role: user.role
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    res.cookie(
      'accessToken',
      newAccessToken,
      {
        httpOnly: true,
        secure: true
      });

    res.status(200).json({ message: "Token refreshed" });

  } catch (error) {
    console.log(error);
    res.status(403).json({ message: "Token expired or invalid" });
  }
};



