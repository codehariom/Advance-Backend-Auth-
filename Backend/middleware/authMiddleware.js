import jwt from "jsonwebtoken";
import expressAsyncHandler from "express-async-handler";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

const protect = expressAsyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_Secret); // 👈 check .env name

      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!req.user) {
        return res.status(404).json({ message: "User not found" });
      }

      return next(); 
    } catch (error) {
      return res.status(401).json({ message: "Verification failed. Invalid token" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
});

export default protect;