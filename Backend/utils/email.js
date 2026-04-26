const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter once at startup
transporter.verify((err) => {
  if (err) {
    console.error('❌ SMTP not ready:', err.message);
  } else {
    console.log('✅ SMTP server ready to send emails');
  }
});

const sendEmail = async (to, subject, text) => {
  const email = to?.trim()?.replace(/['"]/g, '');

  console.log('📨 sendEmail called with:', { email, subject });

  // ❗ Do NOT throw – fail silently
  if (!email) {
    console.error('❌ Email skipped: recipient missing');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"GlideWay" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text,
    });

    console.log('✅ Email sent via Nodemailer:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    // DO NOT throw
  }
};

module.exports = sendEmail;
