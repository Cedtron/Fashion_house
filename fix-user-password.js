// Simple script to fix a user's password
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

// ⚠️ CHANGE THESE VALUES TO YOUR ACTUAL CREDENTIALS
const USER_EMAIL = 'test@example.com';        // Your email
const PASSWORD_HINT = 'test';                 // Your password hint answer
const NEW_PASSWORD = 'newpassword123';        // Your desired new password

async function fixUserPassword() {
  console.log('🔧 Fixing user password...\n');
  console.log(`📧 Email: ${USER_EMAIL}`);
  console.log(`🔑 New Password: ${NEW_PASSWORD}`);
  console.log(`💡 Password Hint: ${PASSWORD_HINT}\n`);
  
  try {
    // Step 1: Verify email
    console.log('1️⃣ Verifying email...');
    await axios.post(`${API_BASE}/users/verify-email`, {
      email: USER_EMAIL
    });
    console.log('✅ Email verified\n');
    
    // Step 2: Verify password hint
    console.log('2️⃣ Verifying password hint...');
    await axios.post(`${API_BASE}/users/verify-password-hint`, {
      email: USER_EMAIL,
      passwordHint: PASSWORD_HINT
    });
    console.log('✅ Password hint verified\n');
    
    // Step 3: Change password
    console.log('3️⃣ Changing password...');
    await axios.post(`${API_BASE}/users/change-password-final`, {
      email: USER_EMAIL,
      passwordHint: PASSWORD_HINT,
      newPassword: NEW_PASSWORD
    });
    console.log('✅ Password changed successfully\n');
    
    // Step 4: Test the new password
    console.log('4️⃣ Testing new password...');
    const testResponse = await axios.post(`${API_BASE}/users/debug-user-password`, {
      email: USER_EMAIL,
      testPassword: NEW_PASSWORD
    });
    
    if (testResponse.data.testResults.passwordMatch) {
      console.log('🎉 SUCCESS! Password is working correctly!');
      console.log('\n✅ You can now login with:');
      console.log(`   Email: ${USER_EMAIL}`);
      console.log(`   Password: ${NEW_PASSWORD}`);
    } else {
      console.log('❌ Password test failed. Something went wrong.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    console.log('\n💡 Common issues:');
    console.log('   - Wrong email address');
    console.log('   - Wrong password hint answer');
    console.log('   - Backend server not rurd();serPasswoixU!\n');

fthis file the top of atWORD PASSNEW_INT, and SWORD_H, PASAILEM USER_: UpdateNTTA  IMPOR'⚠️g(nsole.lo
co\n');================'===g(
console.lox Tool');word FiPasse.log('🚀 

consol;
  }
}ot exist')s ndoe - User .log('      consolenning');
