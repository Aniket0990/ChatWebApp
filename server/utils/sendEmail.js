const nodemailer = require("nodemailer");
const dns = require("dns");

// Render and cloud servers do not have IPv6 routing enabled; force IPv4 DNS resolution
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

exports.sendEmail = async (to, subject, text) => {
  const mailUser = process.env.MAIL_USER ? process.env.MAIL_USER.trim() : "";
  // Remove all spaces and quotation marks that might have been copied into Render dashboard
  const mailPass = process.env.MAIL_PASS
    ? process.env.MAIL_PASS.replace(/[\s"']/g, "").trim()
    : "";

  if (!mailUser || !mailPass) {
    throw new Error(
      "Email credentials not configured. Please ensure MAIL_USER and MAIL_PASS are set in your Render Environment Variables."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: mailUser,
      pass: mailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"Connecto" <${mailUser}>`,
    to: to,
    subject: subject,
    text: text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Nodemailer] Email sent successfully to: ${to}`);
  } catch (error) {
    console.error("[Nodemailer] Error sending email:", error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};
