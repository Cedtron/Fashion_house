const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  console.log('🗄️  Setting up Fashion House Database...\n');

  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  const username = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_DATABASE || 'fashion_house';

  try {
    console.log(`📡 Connecting to MySQL server at ${host}:${port}...`);
    
    // Connect to MySQL server (without specifying database)
    const connection = await mysql.createConnection({
      host,
      port,
      user: username,
      password,
      multipleStatements: true,
    });

    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    console.log(`🏗️  Creating database '${database}' if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
    
    console.log(`✅ Database '${database}' is ready`);

    // Test connection to the specific database
    await connection.query(`USE \`${database}\`;`);
    console.log(`✅ Successfully connected to database '${database}'`);

    await connection.end();
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('🚀 You can now start the backend server');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Make sure MySQL server is running');
      console.log('   2. Check if the port 3306 is correct');
      console.log('   3. Verify your database credentials in .env file');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Access denied - check your credentials:');
      console.log('   1. Verify DB_USERNAME and DB_PASSWORD in .env');
      console.log('   2. Make sure the user has database creation privileges');
    }
    
    process.exit(1);
  }
}

setupDatabase();