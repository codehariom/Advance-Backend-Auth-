import express from "express";
import { registerUser, verifyEmail } from "../controllers/userControllers.js";

const router = express.Router()

// route post new user
// @desc  registeration of user 
// @access private
router.post("/register", registerUser)

// @desc  registeration of user 
// @access private
router.post("/verify", verifyEmail)

export default router