const nodemailer = require('nodemailer');

const sendBookingEmail = async (booking) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // Extract and sanitize email
    const emailRaw = booking.contactDetails?.email || '';
    const email = emailRaw.trim().replace(/['"]/g, '');

    if (!email) {
    console.error('❌ No email found for booking:', booking._id);
    return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        console.error('Invalid email address:', emailRaw);
        throw new Error('Invalid email address provided');
    }

    console.log('Raw email:', emailRaw);
    console.log('Sanitized email:', email);

    const mailOptions = {
        from: `"Bus Ticket Booking" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Booking Confirmation',
        text: `Your booking is confirmed.\nBooking ID: ${booking._id}\nTotal Fare: ₹${booking.totalFare}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return info;
    } catch (error) {
        console.error('Email sending error:', error);
        throw error;
    }
};

module.exports = sendBookingEmail;
