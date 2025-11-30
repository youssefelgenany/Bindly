const nodemailer = require("nodemailer");
const Email = require("../models/EmailModel");

const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 2),
  maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 100),
  rateDelta: Number(process.env.SMTP_RATE_DELTA || 1000),
  rateLimit: Number(process.env.SMTP_RATE_LIMIT || 5),
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const stripTrailingSlash = (value) => (value ? value.replace(/\/+$/, "") : value);

function resolveUrl(candidates, fallback) {
  for (const candidate of candidates) {
    if (candidate) {
      return stripTrailingSlash(candidate);
    }
  }
  return stripTrailingSlash(fallback);
}

async function sendVerificationEmail(to, token, name) {
  console.log("📧 sendVerificationEmail called with:", { to, token, name });

  const fallbackFrontend =
    process.env.NODE_ENV === "production" ? "https://bindly.app" : "http://localhost:3000";
  const fallbackBackend =
    process.env.NODE_ENV === "production" ? "https://api.bindly.app" : "http://localhost:5000";

  // Prefer explicitly configured URLs but fall back gracefully for dev/prod
  const frontendUrl = resolveUrl(
    [
      process.env.VERIFICATION_APP_URL,
      process.env.FRONTEND_URL,
      process.env.PUBLIC_FRONTEND_URL,
      process.env.APP_BASE_URL,
      process.env.APP_LOGIN_URL ? process.env.APP_LOGIN_URL.replace(/\/login$/, "") : undefined,
    ],
    fallbackFrontend
  );

  const backendUrl = resolveUrl(
    [
      process.env.VERIFICATION_BASE_URL,
      process.env.PUBLIC_BACKEND_URL,
      process.env.BACKEND_URL,
      process.env.API_BASE_URL,
    ],
    fallbackBackend
  );

  const configuredVerifyPage = stripTrailingSlash(process.env.VERIFICATION_LINK_BASE);
  const verifyPageUrl = configuredVerifyPage || `${frontendUrl}/verify-email`;
  const verifyUrl = `${verifyPageUrl}${verifyPageUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(
    token
  )}`;

  const loginRedirect =
    stripTrailingSlash(process.env.APP_LOGIN_URL) || `${frontendUrl}/login`;

  console.log("🔗 Resolved verification URLs:", {
    frontendUrl,
    backendUrl,
    verifyUrl,
    loginRedirect,
  });
  
  const sentAt = new Date().toUTCString();

  const textBody = [
    `Hi ${name || "there"},`,
    "",
    "Welcome to Bindly! Please verify your email within the next 24 hours so you can access your account.",
    "",
    `Verification link: ${verifyUrl}`,
    "",
    `You'll be redirected to ${loginRedirect} once verification succeeds.`,
    "",
    `Sent at: ${sentAt}`,
    "Bindly • GUC Events Platform",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify your Bindly account</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F4F6FB;font-family:'Manrope','Segoe UI','Helvetica Neue',Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F6FB;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background-color:#FFFFFF;border-radius:24px;border:1px solid #E3E8F4;box-shadow:0 18px 45px rgba(16,24,40,0.12);overflow:hidden;">
            <tr>
              <td style="padding:32px;background:linear-gradient(120deg,#1D3557,#2F5C8F);color:#FFFFFF;">
                <p style="margin:0;font-size:26px;font-weight:700;letter-spacing:-0.02em;">Bindly</p>
                <p style="margin:8px 0 0;font-size:14px;opacity:0.85;">GUC Events Platform</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 40px 32px;">
                <div style="display:flex;justify-content:center;">
                  <div style="width:64px;height:64px;border-radius:20px;background-color:#E8F1FA;border:2px solid #C7DAF0;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1D3557" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
                      <polyline points="3 7 12 13 21 7"></polyline>
                    </svg>
                  </div>
                </div>
                <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#94A3B8;text-align:center;">Action needed</p>
                <p style="margin:0 0 12px;font-size:24px;font-weight:700;color:#1D3557;text-align:center;letter-spacing:-0.01em;">Verify your Bindly account</p>
                <p style="margin:0 0 16px;font-size:15px;color:#4B5563;line-height:1.7;">
                  Hi ${name || "there"}, your account is almost ready. Please confirm your email within
                  the next 24 hours so we can activate your access to Bindly.
                </p>
                <div style="text-align:center;margin:28px 0;">
                  <a href="${verifyUrl}" style="display:inline-block;padding:14px 46px;border-radius:999px;background-color:#1D3557;color:#FFFFFF;font-weight:600;font-size:16px;text-decoration:none;box-shadow:0 8px 24px rgba(29,53,87,0.25);">
                    Verify My Account
                  </a>
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #E2E8F0;border-radius:18px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1D3557;">What's next?</p>
                      <ol style="margin:0;padding-left:18px;color:#4B5563;font-size:14px;line-height:1.6;">
                        <li style="margin-bottom:6px;">Click the button above (or the link below) to confirm your email.</li>
                        <li style="margin-bottom:6px;">We'll verify the token instantly.</li>
                        <li style="margin:0;">You'll be redirected to <strong>${loginRedirect}</strong> to sign in.</li>
                      </ol>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1D4ED8;">Verification link</p>
                <p style="margin:0 0 24px;font-size:13px;color:#1D4ED8;word-break:break-all;">
                  <a href="${verifyUrl}" style="color:#1D4ED8;text-decoration:none;">${verifyUrl}</a>
                </p>
                <p style="margin:0 0 10px;font-size:13px;color:#6B7280;">
                  Need help? Reply to this email or contact your Bindly administrator and mention the address
                  <strong>${to}</strong>.
                </p>
                <p style="margin:0;font-size:13px;color:#6B7280;">
                  Best regards,<br />
                  <strong>The Bindly Team</strong>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-size:12px;color:#94A3B8;">
            Sent at ${sentAt} • ${frontendUrl.replace(/^https?:\/\//, "")}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
  
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [Verification Email - Dev Mode] Email not sent (SMTP disabled).');
    console.log('   To:', to);
    console.log('   Name:', name);
    console.log('   Verification URL:', verifyUrl);
    console.log('   ⚠️  To enable email sending, configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
    
    // Store email in database for development
    try {
      const emailRecord = new Email({
        to: to,
        subject: "GUC Events — Verify your account",
        html: html,
        verificationToken: token,
        verificationUrl: verifyUrl,
        userInfo: {
          name: name,
          userType: 'Staff/TA/Professor',
          email: to
        }
      });
      
      await emailRecord.save();
      console.log('✅ Email stored in database for development');
      console.log('📧 View emails at: http://localhost:5000/api/dev/emails');
    } catch (error) {
      console.error('❌ Error storing email in database:', error);
    }
    
    return { sent: false, reason: 'SMTP not configured', verificationUrl: verifyUrl };
  }
  
  console.log('📧 Attempting to send verification email...');
  console.log('   SMTP Host:', process.env.SMTP_HOST);
  console.log('   SMTP Port:', process.env.SMTP_PORT || 587);
  console.log('   SMTP User:', process.env.SMTP_USER);
  console.log('   To:', to);
  console.log('   Subject: GUC Events — Verify your account');

  try {
    // Verify transporter connection first
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const mailOptions = {
      from: process.env.SMTP_FROM || `Bindly <salma.husseinhassan@student.guc.edu.eg>`,
      to,
      subject: "GUC Events — Verify your account",
      text: textBody,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', to);
    console.log('   Verification URL:', verifyUrl);
    
    // If using Mailtrap (testing service), also log the verification link
    if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('mailtrap')) {
      console.log('🔗 MAILTRAP TESTING - Verification link logged:');
      console.log('   User:', name);
      console.log('   Email:', to);
      console.log('   Verification URL:', verifyUrl);
      console.log('   Token:', token);
      console.log('   ⚠️  Mailtrap is a testing service - check Mailtrap inbox for the email');
    }
    
    return { sent: true, messageId: info.messageId, verificationUrl: verifyUrl };
  } catch (error) {
    console.error('❌ Failed to send verification email:');
    console.error('   Error:', error.message);
    console.error('   Error Code:', error.code);
    console.error('   Error Response:', error.response);
    console.error('   Full Error:', error);
    return { sent: false, error: error.message, code: error.code, verificationUrl: verifyUrl };
  }
}

module.exports = { sendVerificationEmail };

