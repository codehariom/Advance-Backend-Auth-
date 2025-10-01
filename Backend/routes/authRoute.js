import express from "express";
import { changePassword, forgotPassword, getUserProfile, registerUser, resetPassword, toggle2FA, twofaOTP, userLogin, verifyEmail } from "../controllers/userControllers.js";
import protect from "../middleware/authMiddleware.js";
// import protect from "../middleware/authMiddleware.js";

const router = express.Router()

// route post new user
// @desc  registeration of user 
// @access public
router.post("/register", registerUser)

// route post verify user
// @desc  verification of  user 
// @access public
router.post("/verify", verifyEmail)

// route post forgot password
// @desc  forgot password 
// @access public
router.post("/forgot-password", forgotPassword)

// route post reset password
// @desc  reset password of user 
// @access public
router.post("/reset-password", resetPassword)

// route verify with 2fa OTP
// @desc  Multifactor verification of  user 
// @access public
router.post("/2FA-OTP", twofaOTP)

// route post Change password
// @desc Change Password  of user 
// @access private
router.post("/change-password", protect, changePassword)


// route post Enable/Disable 2FA
// @desc user Enable/Disable 2FA
// @access private
router.post("/2FA-enable", protect, toggle2FA)

// route post Login (Modified for 2FA)
// @desc user user login 
// @access public
router.post("/login", userLogin)

// route post Login user profile
// @desc user user login there data
// @access private
router.get("/profile", protect, getUserProfile)



export default router