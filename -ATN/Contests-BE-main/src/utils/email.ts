import dotenv from "dotenv";
dotenv.config();
const nodemailer = require("nodemailer");

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

type EmailOptions = {
  to: string;
  subject: string;
  html: string;
};
export const sendOtp = async ({ to, subject, html }: EmailOptions) => {
  const info = await transporter.sendMail({
    from: `"Support Contest System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  console.log("Email sent: %s", info.messageId);
};
