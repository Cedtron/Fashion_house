// Test script to debug login password issue
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function debugLoginIssue() {
  try {
    console.log('🔍 Starting login debug process...\n');
    
    // You can change these values
    const testEmail = 'test@example.com';  // Change this to your email
    const testPassword = 'newpassword123';  // Change this to your password
    const passwordHint = 'test';  // Change this to your password hint
    
    console.log(`📧 Testing with email: ${testEmail}`);
    console.log(`🔑 Testing with password: ${testPassword}`);
    console.log(`💡 Password hint: ${passwordHint}\n`);
    
    // Step 1: Debug current password state
    console.log('1️⃣ Checking current password state...');
    try {
      const debugResponse = await axios.post(`${API_BASE}/users/debug-user-password`, {
        email: testEmail,
        testPassword: testPassword
      });
      
      console.log('✅ User found:', debugResponse.data.email);
      console.log('👤 Username:', debugResponse.data.username);
      console.log('🔒 Password hash preview:', debugResponse.data.passwordHashPreview);
      console.log('📏 Password hash length:', debugResponse.data.passwordHashLength);
      console.log('🟢 User active:', debugResponse.data.isActive);
      
      if (debugResponse.data.testResults.passwordMatch) {
        console.log('✅ PASSWORD IS CORRECT! Login should work.');
        console.log('🎉 Try logging in with your credentials.');
        return;
      } else {
        console.log('❌ PASSWORD IS INCORRECT! Need to reset it.');
        console.log('🔧 Starting password reset process...\n');
      }
    } catch (error) {
      console.log('❌ Error checking password:', error.response?.data?.message || error.message);
      console.log('🔧 Will try to reset password anyway...\n');
    }
    
    // Step 2: Reset password using step-by-step process
    console.log('2️⃣ Step 1: Verifying email...');
    try {
      const emailResponse = await axios.post(`${API_BASE}/users/verify-email`, {
        email: testEmail
      });
      console.log('✅ Email verified:', emailResponse.data.message);
    } catch (error) {
      console.log('❌ Email verification failed:', error.response?.data?.message || error.message);
      return;
    }
    
    console.log('\n3️⃣ Step 2: Verifying password hint...');
    try {
      const hintResponse = await axios.post(`${API_BASE}/users/verify-password-hint`, {
        email: testEmail,
        passwordHint: passwordHint
      });
      console.log('✅ Password hint verified:', hintResponse.data.message);
    } catch (error) {
      console.log('❌ Password hint verification failed:', error.response?.data?.message || error.message);
      console.log('💡 Make sure your password hint is correct!');
      return;
    }
    
    console.log('\n4️⃣ Step 3: Changing password...');
    try {
      const changeResponse = await axios.post(`${API_BASE}/users/change-password-final`, {
        email: testEmail,
        passwordHint: passwordHint,
        newPassword: testPassword
      });
      console.log('✅ Password changed:', changeResponse.data.message);
    } catch (error) {
      console.log('❌ Password change failed:', error.response?.data?.message || error.message);
      return;
    }
    
    // Step 3: Verify the fix worked
    console.log('\n5️⃣ Verifying password fix...');
    try {
      const verifyResponse = await axios.post(`${API_BASE}/users/debug-user-password`, {
        email: testEmail,
        testPassword: testPassword
      });
      
      if (verifyResponse.data.testResults.passwordMatch) {
        console.log('🎉 SUCCESS! Password is now correct!');
        console.log('✅ You can now login with:');
        console.log(`   Email: ${testEmail}`);
        console.log(`   Password: ${testPassword}`);
      } else {
        console.log('❌ Password is still incorrect. There might be a deeper issue.');
        console.log('🔍 Password hash:', verifyResponse.data.passwordHashPreview);
      }
    } catch (error) {
      console.log('❌ Error verifying fix:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

// Run the debug
console.log('🚀 Login Debug Tool');
console.log('==================\n');
console.log('⚠️  IMPORTANT: Make sure to update the email, password, and password hint in this script!\n');

debugLoginIssue();