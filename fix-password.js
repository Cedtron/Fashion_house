// Simple script to fix a user's password
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

// CHANGE THESE VALUES TO YOUR ACTUAL CREDENTIALS
const USER_EMAIL = 'test@example.com';        // Your email
const PASSWORD_HINT = 'test';                 // Your password hint answer  
const NEW_PASSWORD = 'newpassword123';        // Your desired new password

async function fixPassword() {
  console.log('Fixing user password...');
  console.log('Email:', USER_EMAIL);
  console.log('New Password:', NEW_PASSWORD);
  
  try {
    // Step 1: Verify email
    console.log('1. Verifying email...');
    await axios.post(`${API_BASE}/users/verify-email`, {
      email: USER_EMAIL
    });
    console.log('✅ Email verified');
    
    // Step 2: Verify password hint
    console.log('2. Verifying password hint...');
    await axios.post(`${API_BASE}/users/verify-password-hint`, {
      email: USER_EMAIL,
      passwordHint: PASSWORD_HINT
    });
    console.log('✅ Password hint verified');
    
    // Step 3: Change password
    console.log('3. Changing password...');
    await axios.post(`${API_BASE}/users/change-password-final`, {
      email: USER_EMAIL,
      passwordHint: PASSWORD_HINT,
      newPassword: NEW_PASSWORD
    });
    console.log('✅ Password changed successfully');
    
    // Step 4: Test the new password
    console.log('4. Testing new password...');
    const testResponse = await axios.post(`${API_BASE}/users/debug-user-password`, {
      email: USER_EMAIL,
      testPassword: NEW_PASSWORD
    });
    
    if (testResponse.data.testResults.passwordMatch) {
      console.log('🎉 SUCCESS! You can now login with:');
      console.log('Email:', USER_EMAIL);
      console.log('Password:', NEW_PASSWORD);
    } else {
      console.log('❌ Password test failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

fixPassword();