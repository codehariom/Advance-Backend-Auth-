import asyncHandler from "express-async-handler";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/prisma/client.js";
import generateToken from "../helpers/generateToken.js";
import sendEmail from "../helpers/sendEmail.js";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

// New user register

export const registerUser = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    return res.status(400).json({ message: "User Already Registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  const user = await prisma.user.create({
    data: { username, email, password: hashedPassword, otp, otpExpiry },
  });

  try {
    await sendEmail(email, username, "register", otp);
    res.status(201).json({
      message: "User registered. Check your email for OTP.",
      user,
    });
  } catch (error) {
    // If email fails, we still want to return 201, but log the email error
    console.error("Email sending failed:", error.message);
    res.status(201).json({
      message:
        "User registered, but failed to send OTP email. Contact support.",
      user,
    });
  }
});



//Verify email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  // Make sure OTP comparison is string
  if (String(user.otp) !== String(otp)) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // Convert otpExpiry to Date and compare
  const now = new Date();
  const expiry = new Date(user.otpExpiry);

  if (expiry < now) {
    return res.status(400).json({ message: "OTP has expired" });
  }

  await prisma.user.update({
    where: { email },
    data: { isVerified: true, otp:null , otpExpiry: null },
  });

  res.status(200).json({ message: "Email verified successfully" });
});