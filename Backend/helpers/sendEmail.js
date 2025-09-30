import nodemailer from "nodemailer";

// Email templates for different flows
const templates = {
  register: (username, otp) => ({
    subject: "Please, Verify Your Email Address",
    text: `Hi ${username}, your OTP is ${otp}. It will expire in 10 minutes.`,
    html: `<h2>Welcome, ${username}!</h2><p>Your OTP is <b>${otp}</b>. It will expire in <b>10 minutes</b>.</p>`,
  }),

  twoFactor: (username, otp) => ({
    subject: "Two-Factor Authentication Code",
    text: `Hi ${username}, your OTP is ${otp}. It will expire in 10 minutes.`,
    html: `<h2>Two-Factor Authentication</h2><p>Hi ${username}, use <b>${otp}</b> to login. It will expire in <b>10 minutes</b>.</p>`,
  }),

  resetPassword: (username, link) => ({
    subject: "Reset Your Password",
    text: `Hi ${username}, reset your password here: ${link}. This link is valid for 15 minutes.`,
    html: `<h2>Password Reset</h2><p>Hi ${username}, click <a href="${link}">here</a> to reset your password. This link is valid for <b>15 minutes</b>.</p>`,
  }),
};

// Main email sender
const sendEmail = async (to, username, type, data) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Pick correct template
    if (!templates[type]) {
      throw new Error(`Email template for type "${type}" not found.`);
    }

    const { subject, text, html } = templates[type](username, data);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });

    console.log(`📧 Email sent to ${to} for ${type}`);
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw error;
  }
};

export default sendEmail;