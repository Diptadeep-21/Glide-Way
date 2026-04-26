require('dotenv').config();
const sendEmail = require('./email');

(async () => {
  try {
    console.log('➡️ Test email script started');

    // 👇 PASS ARGUMENTS (not an object)
    await sendEmail(
      '23051744@kiit.ac.in',
      'Nodemailer Test Email',
      'This is a test email sent using Nodemailer 🚀'
    );

    console.log('✅ Test email sent successfully');
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
  }
})();
