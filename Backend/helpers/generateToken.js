import jwt from "jsonwebtoken";

const generateToken = (id) => {
  if (!process.env.JWT_Secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign({ id }, process.env.JWT_Secret, {
    expiresIn: "30d",
  });
};

export default generateToken;