const nodemailer = require('nodemailer');
const https = require('https');

const hasSmtpConfig = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;
let transporter = null;

if (hasSmtpConfig) {
  const port = Number(process.env.EMAIL_PORT) || 587;
  const secure = port === 465;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: port,
    secure: secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 8000, // 8s
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });

  // Verify transporter once at startup, catch error to prevent server crash
  transporter.verify((err) => {
    if (err) {
      console.error('❌ SMTP transporter initialization failed:', err.message);
    } else {
      console.log('✅ SMTP transporter is ready to send emails');
    }
  });
} else {
  console.log('⚠️ SMTP environment variables are not fully configured. Email service will run in mock mode (console logging).');
}

/**
 * Generic email sending function
 * Supports both object-based arguments: sendEmail({ to, subject, html, text })
 * and positional arguments: sendEmail(to, subject, text)
 */
const sendEmail = async (toOrParams, subjectParam, textParam) => {
  let to, subject, html, text;

  if (typeof toOrParams === 'object' && toOrParams !== null) {
    to = toOrParams.to;
    subject = toOrParams.subject;
    html = toOrParams.html;
    text = toOrParams.text;
  } else {
    to = toOrParams;
    subject = subjectParam;
    text = textParam;
  }

  const email = to?.trim()?.replace(/['"]/g, '');

  console.log(`📨 sendEmail called for recipient: ${email}, Subject: "${subject}"`);

  if (!email) {
    console.error('❌ Email skipped: recipient missing');
    return { success: false, error: 'Recipient missing' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ Email skipped: invalid email format:', email);
    return { success: false, error: 'Invalid email address' };
  }

  // 1. If Resend API key is configured, try sending via Resend HTTP API (using core https module)
  if (process.env.RESEND_API_KEY) {
    try {
      const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';
      console.log(`📨 Attempting to send email via Resend API from: ${fromAddress}`);

      const resData = await new Promise((resolve, reject) => {
        const postData = JSON.stringify({
          from: fromAddress,
          to: [email],
          subject: subject,
          html: html || `<p>${text}</p>`,
          text: text || html?.replace(/<[^>]*>/g, ''),
        });

        const options = {
          hostname: 'api.resend.com',
          port: 443,
          path: '/emails',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        };

        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            let parsed = {};
            try {
              parsed = JSON.parse(body);
            } catch (e) {
              parsed = { error: body };
            }

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ ok: true, data: parsed });
            } else {
              resolve({ ok: false, data: parsed });
            }
          });
        });

        req.on('error', (e) => {
          reject(e);
        });

        req.write(postData);
        req.end();
      });

      if (resData.ok) {
        console.log('✅ Email sent via Resend API successfully:', resData.data.id);
        return { success: true, messageId: resData.data.id };
      } else {
        console.error('❌ Resend API returned error:', resData.data);
      }
    } catch (resendError) {
      console.error('❌ Resend API sending failed:', resendError.message);
    }
  }

  // 2. If Resend is not configured or failed, and SMTP is configured, try sending via SMTP
  if (transporter) {
    try {
      const from = `"GlideWay" <${process.env.EMAIL_USER}>`;
      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        text,
        html,
      });

      console.log('✅ Email sent via Nodemailer SMTP:', info.messageId || info.response);
      return { success: true, messageId: info.messageId, response: info.response };
    } catch (err) {
      console.error(`❌ SMTP email sending failed to ${email}:`, err.message);
    }
  }

  // 2. Fallback: Log mock email details to console
  console.log('\n--- 📨 [MOCK EMAIL FALLBACK] ---');
  console.log(`To:      ${email}`);
  console.log(`Subject: ${subject}`);
  if (text) console.log(`Text:\n${text}`);
  if (html) console.log(`HTML:\n${html}`);
  console.log('---------------------------------\n');

  return { success: true, mock: true };
};

/**
 * Send Booking Confirmation Email
 */
const sendBookingEmail = async (booking, bus) => {
  try {
    const trackingLink = booking.trackingLink || (bus.isTrackingEnabled ? `${process.env.FRONTEND_URL}/track-bus/${booking.busId}/${booking._id}` : null);
    const chatLink = booking.isChatEnabled ? `${process.env.FRONTEND_URL}/booking-summary/${booking._id}` : null;
    
    return await sendEmail({
      to: booking.contactDetails.email,
      subject: 'Booking Confirmation - GlideWay',
      html: `
        <h2>Booking Confirmed!</h2>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Route:</strong> ${bus.source} to ${bus.destination}</p>
        <p><strong>Seats:</strong> ${booking.seatsBooked.join(', ')}</p>
        <p><strong>Boarding Point:</strong> ${booking.boardingPoint || 'N/A'}</p>
        <p><strong>Total Fare:</strong> ₹${booking.totalFare}</p>
        <p><strong>Travel Date:</strong> ${new Date(booking.travelDate).toLocaleDateString('en-IN')}</p>
        ${trackingLink ? `<p><a href="${trackingLink}">Track Your Bus</a></p>` : '<p>Live tracking not available</p>'}
        ${chatLink ? `<p><a href="${chatLink}">Chat with Driver</a></p>` : '<p>Chat with driver not available</p>'}
      `,
    });
  } catch (err) {
    console.error('Error generating booking email:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send Cancellation Confirmation Email
 */
const sendCancellationEmail = async (booking, bus) => {
  try {
    return await sendEmail({
      to: booking.contactDetails.email,
      subject: 'Booking Cancellation Confirmation - GlideWay',
      html: `
        <h2>Booking Cancelled</h2>
        <p>Your booking has been successfully cancelled.</p>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Route:</strong> ${bus.source} to ${bus.destination}</p>
        <p><strong>Seats:</strong> ${booking.seatsBooked.join(', ')}</p>
        <p><strong>Boarding Point:</strong> ${booking.boardingPoint || 'N/A'}</p>
        <p><strong>Total Fare:</strong> ₹${booking.totalFare}</p>
        <p><strong>Travel Date:</strong> ${new Date(booking.travelDate).toLocaleDateString('en-IN')}</p>
        <p><strong>Cancellation Reason:</strong> ${booking.cancellationReason || 'Not provided'}</p>
        <p>If you have any questions, please contact our support team.</p>
      `,
    });
  } catch (err) {
    console.error('Error generating cancellation email:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send Group Invitation Email
 */
const sendGroupInvitationEmail = async (memberEmail, booking, bus) => {
  try {
    const groupChatLink = booking.allowSocialTravel
      ? `${process.env.FRONTEND_URL}/group-chat/${booking._id}/${encodeURIComponent(memberEmail)}`
      : null;

    return await sendEmail({
      to: memberEmail,
      subject: 'Group Booking Invitation - GlideWay',
      html: `
        <h2>You've Been Added to a Group Booking</h2>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Route:</strong> ${bus.source} to ${bus.destination}</p>
        <p><strong>Travel Date:</strong> ${new Date(booking.travelDate).toLocaleDateString('en-IN')}</p>
        <p>Please confirm your participation: <a href="${process.env.FRONTEND_URL}/confirm-group-booking/${booking._id}/${memberEmail}">Confirm</a></p>
        ${groupChatLink
          ? `<p>Join the group chat: <a href="${groupChatLink}">Join Group Chat</a></p>`
          : '<p>Group chat not available</p>'}
      `,
    });
  } catch (err) {
    console.error('Error generating group invitation email:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send Delay Notice Email
 */
const sendDelayNoticeEmail = async (booking, delayNotice) => {
  try {
    return await sendEmail({
      to: booking.contactDetails.email,
      subject: `Delay Notice for Your Booking (${booking._id}) - GlideWay`,
      html: `
        <h3>Important Update: Delay in Your Journey</h3>
        <p><strong>Route:</strong> ${booking.busId.source} to ${booking.busId.destination}</p>
        <p><strong>Seats:</strong> ${booking.seatsBooked.join(', ')}</p>
        <p><strong>Travel Date:</strong> ${new Date(booking.travelDate).toLocaleDateString('en-IN')}</p>
        <p><strong>Delay Notice:</strong> ${delayNotice}</p>
      `,
    });
  } catch (err) {
    console.error('Error generating delay notice email:', err.message);
    return { success: false, error: err.message };
  }
};

// Attach helper methods to sendEmail function for backwards compatibility
sendEmail.sendEmail = sendEmail;
sendEmail.sendBookingEmail = sendBookingEmail;
sendEmail.sendCancellationEmail = sendCancellationEmail;
sendEmail.sendGroupInvitationEmail = sendGroupInvitationEmail;
sendEmail.sendDelayNoticeEmail = sendDelayNoticeEmail;

module.exports = sendEmail;
