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
        data: { isVerified: true, otp: null, otpExpiry: null },
    });

    res.status(200).json({ message: "Email verified successfully" });
});

// Verify 2fa otp

export const twofaOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
    }

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if (!user || user.otp !== otp || user.otpExpiry < new Date()) {
        res.status(400).json("Invalid Or Expired 2FA Otp");
    }

    const token = generateToken(user.id);
    await prisma.user.update({
        where: { email },
        data: { isLoggedIn: true, otp: null, otpExpiry: null },
    });

    res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email,
        token,
    });
});

// reset password
export const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    //  Find user with reset token
    const user = await prisma.user.findFirst({
      where: { token:token, otpExpiry: { gt: new Date() } },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or Expired reset Token" });
    }

    //  Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    //  Update user password & clear reset fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        otpExpiry: null,
      },
    });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }
});


// forgot password 
export const forgotPassword = asyncHandler(async(req,res)=>{
    const {email} = req.body;
    const user = await prisma.user.findUnique({
        where:{email}
    })

    if(!user){
        res.status(404).json("User not found")
    }
    const resetToken = uuidv4()

    const resetTokenExipry = new Date(Date.now() + 15 *60*1000);

    await prisma.user.update({
        where:{email},
        data:{token:resetToken, otpExpiry:resetTokenExipry}
    })

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendEmail(email, user.username,"resetPassword",resetLink)
    res.json({message:"Password reset link sent to your email"})
})

// change Password 
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // 1. Get user
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user || !user.password) {
    return res.status(404).json({ message: "User not found or Missing Password" });
  }

  // 2. Verify old password
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid old password" });
  }

  // 3. Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 4. Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password:hashedPassword },
  });

  try {
    const loginLink = `http://localhost:8000/api/user/login/`
    await sendEmail(user.email, user.username, "passwordChanged",loginLink);
  } catch (error) {
    console.error("Failed to send password change email:", error.message);
  }

  // 5. Respond
  return res.json({ message: "Password changed successfully" });
});

// Enable/Disable 2FA (Protected Route)
export const toggle2FA = asyncHandler(async (req, res) => {
  const { enable } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { twoFactorEnabled: enable },
  });

  res.json({ message: `2FA ${enable ? "enabled" : "disabled"} successfully` });
});

// user login 
export const userLogin = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    // 3. Check email verification
    if (!user.isVerified) {
      return res.status(401).json({ message: "Email is not verified" });
    }

    // 4. If 2FA enabled
    if (user.twoFactorEnabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.user.update({
        where: { email },
        data: { otp, otpExpiry },
      });

      await sendEmail(email, user.username, "twoFactor", otp);

      return res.json({
        message: "2FA OTP sent to your email",
        twoFactorEnabled: true,
        email,
      });
    }

    // 5. Normal login
    const token = generateToken(user.id);

    await prisma.user.update({
      where: { email },
      data: { isLoggedIn: true, otp: null, otpExpiry: null }, // ✅ clear old OTP
    });

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// user Profile

export const getUserProfile = asyncHandler(async (req, res) => {
  // req.user is already set in protect middleware after JWT verification
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json(user);
});