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

// log in :
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

    const token = sign({
      _id: user._id,
      role: user.role,
    },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    user.subscribed = true;
    await user.save();

    res.cookie('token', token, {
      axAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
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

// log_out : 
export const logout = (req, res) => {
  try {
    res.clearCookie('token');
    res.status(200).json({ message: 'User logged out successfully' });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'internal server error' });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const userId = await User.findByIdAndDelete(id);

    if (!userId) return res.status(404).json({ message: "user not found" });

    res.status(204).json({ message: "user deleted successfully" })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "internal server error" })
  }

};

export const getMyProfile = async (req, res) => {

  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "user not found" });

    res.status(200).json(user)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "internal server error" })
  }
}



