import dotenv from "dotenv";
dotenv.config();
const nodemailer = require("nodemailer");

/**
 * Thời gian hiệu lực của mã OTP (đơn vị: PHÚT). Đổi số này (hoặc đặt
 * OTP_TTL_MINUTES trong .env) để đổi thời hạn mã. Khi đổi nhớ sửa đồng hồ đếm
 * ngược cho khớp (tính bằng giây = số phút x 60):
 *  - App: Contests-Mobile-app/lib/features/auth/presentation/forgot_password_screen.dart (_otpLifetimeSeconds)
 *  - Web: Contests-FE-main/src/features/auth/components/forgot-password/OtpStep.tsx (useState(...) và setCountdown(...))
 */
const configuredOtpMinutes = Number(process.env.OTP_TTL_MINUTES);
export const OTP_TTL_MINUTES: number =
  Number.isFinite(configuredOtpMinutes) && configuredOtpMinutes > 0
    ? configuredOtpMinutes
    : 5;

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
    // Tên người gửi lấy từ MAIL_FROM_NAME trong .env (mặc định nếu để trống).
    // Địa chỉ gửi luôn là EMAIL_USER vì Gmail không cho gửi dưới địa chỉ khác.
    from: `"${process.env.MAIL_FROM_NAME || "CSKH ONLINE"}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  console.log("Email sent: %s", info.messageId);
};
