const nodemailer = require("nodemailer");

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // Use SSL on port 465 for fast cloud delivery on Render/AWS
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }
  return transporter;
};

exports.sendEmail = async (to, subject, text) => {
  try {
    const mailTransporter = getTransporter();

    const mailOptions = {
      from: `"Connecto" <${process.env.MAIL_USER}>`,
      to: to,
      subject: subject,
      text: text,
    };

    await mailTransporter.sendMail(mailOptions);
    console.log(`[Nodemailer] Email sent successfully to: ${to}`);
  } catch (error) {
    console.error("[Nodemailer] Error sending email:", error);
    throw error;
  }
};
