// Simple test script to verify password reset functionality
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testPasswordReset() {
  try {
    console.log('🧪 Testing Password Reset Flow...');
    
    const testEmail = 'test@example.com';
    const testPasswordHint = 'test';
    const newPassword = 'newpassword123';
    
    console.log(`📧 Testing with email: ${testEmail}`);
    
    // Step 1: Request password reset with password hint
    console.log('\n1️⃣ Step 1: Requesting password reset...');
    const forgotResponse = await axios.post(`${API_BASE}/users/forgot-password`, {
      email: testEmail,
      passwordHint: testPasswordHint
    });
    
    console.log('✅ Forgot password response:', forgotResponse.data);
    const verificationCode = forgotResponse.data.code;
    
    if (!verificationCode) {
      throw new Error('No verification code received');
    }
    
    // Step 2: Reset password using the code
    console.log('\n2️⃣ Step 2: Resetting password...');
    const resetResponse = await axios.post(`${API_BASE}/users/reset-password`, {
      email: testEmail,
      code: verificationCode,
      newPassword: newPassword
    });
    
    console.log('✅ Password reset response:', resetResponse.data);
    
    // Step 3: Verify password was updated using debug endpoint
    console.log('\n3️⃣ Step 3: Verifying password update...');
    const checkResponse = await axios.post(`${API_BASE}/users/check-password`, {
      email: testEmail
    });
    
    console.log('✅ Password check response:', checkResponse.data);
    
    console.log('\n🎉 Password reset test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testPasswordReset();