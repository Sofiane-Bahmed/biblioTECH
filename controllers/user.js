import bcrypt from "bcrypt"
import Jwt from "jsonwebtoken"

import { User } from "../models/user.js"
import { sendEmailNotification } from "../utils/mailer.js";

const { sign } = Jwt

// register : 
export const register = async (req, res) => {

  const { fullName, password, email, role } = req.body;

  try {
    hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      fullName,
      password: hashedPassword,
      email,
      role,
      subscribed: true
    });

    await user.save()
    res.json(user);

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// log in :
export const login = async (req, res) => {

  const { email, password } = req.body;

  try {
    const user = await User.findOne(email);
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
    res.status(500).json({ message: 'Something went wrong' });
  }

  try {
    // send welcome email to new user
    const user = await User.findOne(email);
    const subject = 'Welcome to the Library';
    const text = `Dear ${user.fullName},\n\nWelcome to the library! We hope you enjoy our collection of books.\n\nSincerely,\nThe Library Team`;
    sendEmailNotification(user.email, subject, text);

  } catch (error) {
    const user = await User.findOne(email);
    console.log(`Error sending welcome email to ${user.email}: ${error}`);
  }
};

// log_out : 
export const logout = (res) => {
  try {
    res.clearCookie('token');
    res.json({ message: 'User logged out successfully' });
  } catch (err) {
    res.json(err);
  }
};



