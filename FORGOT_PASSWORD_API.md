# 🔐 Forgot Password API Documentation

## Overview

Complete forgot password system with 3-step verification process:
1. **Request Reset Code** - Send 6-digit code to user's email
2. **Verify Code** - Validate the received code
3. **Reset Password** - Set new password with verified code

## 🔗 API Endpoints

### 1. Request Password Reset Code

**POST** `/users/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a reset code has been sent."
}
```

**Notes:**
- Always returns success message for security (doesn't reveal if email exists)
- Code expires in 15 minutes
- Only one active code per user at a time

---

### 2. Verify Reset Code

**POST** `/users/verify-reset-code`

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Code verified successfully",
  "valid": true
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Invalid or expired code"
}
```

---

### 3. Reset Password

**POST** `/users/reset-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Invalid or expired code"
}
```

## 🎯 Frontend Integration

The frontend component handles the complete flow:

### Step 1: Email Input
- User enters registered email
- Calls `/users/forgot-password`
- Shows success message

### Step 2: Code Verification
- User enters 6-digit code from email
- Calls `/users/verify-reset-code`
- Includes "Resend Code" functionality

### Step 3: Password Reset
- User enters new password + confirmation
- Validates password strength (min 6 chars)
- Calls `/users/reset-password`
- Redirects to login on success

## 🔧 Features

### Security Features
- ✅ Codes expire in 15 minutes
- ✅ Only one active code per user
- ✅ Secure password hashing (bcrypt)
- ✅ No email enumeration (same response for valid/invalid emails)
- ✅ Code invalidation after use

### User Experience
- ✅ 3-step wizard interface
- ✅ Progress indicators
- ✅ Loading states
- ✅ Error handling with toast notifications
- ✅ Resend code functionality
- ✅ Auto-redirect to login after success

### Development Features
- ✅ Console logging for development (when email not configured)
- ✅ Swagger API documentation
- ✅ TypeScript DTOs with validation
- ✅ Audit logging for password changes

## 📧 Email Configuration (Optional)

For production, add email settings to `.env`:

```env
# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Fashion House <noreply@fashionhouse.com>
```

**Development Mode:**
- If SMTP not configured, codes are logged to console
- Check server logs for reset codes during testing

## 🗄️ Database Schema

### `password_resets` Table
```sql
CREATE TABLE password_resets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  code VARCHAR(6) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  isUsed BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

## 🧪 Testing

### Manual Testing Steps

1. **Test Valid Email:**
   ```bash
   curl -X POST http://localhost:3000/users/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"existing@user.com"}'
   ```

2. **Check Console for Code:**
   ```
   🔐 PASSWORD RESET CODE for existing@user.com: 123456
   ```

3. **Verify Code:**
   ```bash
   curl -X POST http://localhost:3000/users/verify-reset-code \
     -H "Content-Type: application/json" \
     -d '{"email":"existing@user.com","code":"123456"}'
   ```

4. **Reset Password:**
   ```bash
   curl -X POST http://localhost:3000/users/reset-password \
     -H "Content-Type: application/json" \
     -d '{"email":"existing@user.com","code":"123456","newPassword":"newpass123"}'
   ```

### Frontend Testing
1. Navigate to `/forgot-password`
2. Enter registered email
3. Check server console for reset code
4. Enter code in step 2
5. Set new password in step 3
6. Verify redirect to login

## 🚀 Deployment Notes

- Database migration will create `password_resets` table automatically
- Email service is optional - system works with console logging
- All endpoin** 🎉nal!unctionow fully fsystem is assword got pur for--

**Yo

-ction use produng for rate limitiider Consquired)
- renticationc (no authets are publi