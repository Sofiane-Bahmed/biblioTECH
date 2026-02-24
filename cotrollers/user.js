import bcrypt from "bcrypt"
import nodemailer from "nodemailer"
import Jwt from "jsonwebtoken"

import { User } from "../models/user.js"
import { Livre } from "../models/livre.js"

const { sign, verify } = Jwt

// register : 

export const register = async (req, res) => {
  try {
    const newUser = new User(req.body);
    newUser.password = await bcrypt.hash(req.body.password, 10);
    newUser.subscribed = true;
    const user = await newUser.save();
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// log in :

export const sign_in = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(req.body.password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = sign({ email: user.email, fullName: user.fullName, _id: user._id, role: user.role }, 'RESTFULAPIs');
    res.cookie('token', token, { maxAge: 60 * 60 * 24 * 1000 }); // maxAge: 30 days
    res.json({ message: 'Logged in successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }

  try {
    // send welcome email to new user
    const user = await User.findOne({ email: req.body.email });
    const subject = 'Welcome to the Library';
    const text = `Dear ${user.fullName},\n\nWelcome to the library! We hope you enjoy our collection of books.\n\nSincerely,\nThe Library Team`;
    sendEmailNotification(user.email, subject, text);
  } catch (error) {
    const user = await User.findOne({ email: req.body.email });
    console.log(`Error sending welcome email to ${user.email}: ${error}`);
  }
};


//verify role of the user :

export const roleValidation = (requiredRole) => async (req, res, next) => {
  try {
    const role = req.cookies["token"].role;
    if (role === requiredRole) {
      verify(req.cookies["token"].token, 'RESTFULAPIs')

      return next();

    } else {
      res.status(401).json({ message: "Unauthorized user!!" });
    }
  } catch (err) {
    res.json(err);
  }
};


// log_out : 

export const log_out = (req, res) => {
  try {
    res.clearCookie('token');
    res.json({ message: 'User logged out successfully' });
  } catch (err) {
    res.json(err);
  }
};


// voir tous les livres disponibles : 

export const getAllBooks = async (req, res) => {
  try {
    const books = await Livre.find({ copies_disponibles: { $gt: 0 } }).populate('categorie', 'titre');
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};


// send emails


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sofiane.bahmed.fabrikademy@gmail.com',
    pass: 'ipygyjylsehkeqsh'
  }
});

export const sendEmailNotification = async (toEmail, subject, text) => {
  try {
    const mailOptions = {
      from: 'sofiane.bahmed.fabrikademy@gmail.com',
      to: toEmail,
      subject: subject,
      text: text
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${toEmail}`);
  } catch (error) {
    console.log(`Error sending email to ${toEmail}: ${error.message}`);
  }
};