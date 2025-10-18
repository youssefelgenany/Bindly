# Email Configuration Guide

## Issue: Verification emails not being sent

The verification email system requires SMTP configuration. Currently, the email service is not configured, which is why you're not receiving verification emails.

## Required Environment Variables

Add these variables to your `backend/.env` file:

```env
# Email Configuration (Required for verification emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Bindly <no-reply@bindly.app>"

# Frontend URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
APP_LOGIN_URL=http://localhost:3000/login
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password as `SMTP_PASS`

## Other Email Providers

### Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Yahoo:
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

## Testing Email Configuration

After setting up the environment variables:

1. Restart the backend server
2. Try sending a verification email from admin panel
3. Check the server console for email logs
4. Check your email inbox (and spam folder)

## Debugging

The server will now log detailed information about email sending:
- ✅ Configuration status
- 📧 Email sending attempts
- ❌ Any errors that occur

## Quick Fix

If you want to test without setting up email, you can temporarily modify the mailer to log the verification link instead of sending emails.
