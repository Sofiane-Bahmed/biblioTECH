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

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = sign({
      email: user.email,
      fullName: user.fullName,
      _id: user._id,
      role: user.role
    },
      process.env.JWT_SECRET
    );

    res.cookie('token', token, { maxAge: 60 * 60 * 24 * 1000 }); // maxAge: 30 days
    res.json({ message: 'Logged in successfully' });

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



