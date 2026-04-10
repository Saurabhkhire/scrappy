const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendVerificationEmail(toEmail, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/verify-email?token=${token}`;
  const from = process.env.EMAIL_FROM || '"Scrappy" <noreply@scrappy.io>';

  const transporter = createTransporter();
  await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Verify your Scrappy account',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:sans-serif;background:#0f0f12;color:#e2e8f0;margin:0;padding:40px 20px;">
        <div style="max-width:480px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:40px;border:1px solid #2d2d44;">
          <h1 style="margin:0 0 8px;font-size:24px;color:#fff;">Verify your email</h1>
          <p style="color:#94a3b8;margin:0 0 32px;">Click the button below to activate your Scrappy account. This link expires in 24 hours.</p>
          <a href="${link}"
             style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#4ecdc4);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">
            Verify Email Address
          </a>
          <p style="color:#64748b;font-size:12px;margin-top:32px;">
            If the button doesn't work, copy this link:<br>
            <a href="${link}" style="color:#6c63ff;word-break:break-all;">${link}</a>
          </p>
          <p style="color:#64748b;font-size:12px;margin-top:16px;">
            If you didn't create a Scrappy account, you can safely ignore this email.
          </p>
        </div>
      </body>
      </html>
    `,
  });
}

module.exports = { sendVerificationEmail };
