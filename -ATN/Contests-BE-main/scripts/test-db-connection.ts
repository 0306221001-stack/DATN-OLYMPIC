/**
 * Simple Database Connection Test Script
 * Run this script to quickly test if your database connection is working
 *
 * Usage:
 * npm run test:db-connection
 * or
 * npx tsx scripts/test-db-connection.ts
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ["info", "warn", "error"],
});

async function testConnection() {
  console.log("🔍 Testing database connection...\n");

  const startTime = Date.now();

  try {
    // Test basic connection
    console.log("📡 Connecting to database...");
    await prisma.$connect();
    console.log("✅ Connection established successfully!");

    // // Test query execution
    // console.log('\n🔍 Testing query execution...');
    // const result = await prisma.$queryRaw`SELECT 1 as test_value, NOW() as current_time`;
    // console.log('✅ Query executed successfully:', result);

    // Check database name
    console.log("\n📊 Getting database information...");
    const dbName = await prisma.$queryRaw`SELECT DATABASE() as database_name`;
    console.log("✅ Connected to database:", dbName);

    // Test Prisma client functionality
    console.log("\n🔧 Testing Prisma client...");

    // Check if we can access schema info
    try {
      const tables = await prisma.$queryRaw`
        SELECT COUNT(*) as table_count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
      `;
      console.log("✅ Database schema accessible:", tables);
    } catch (error) {
      console.log("⚠️ Schema check failed:", (error as Error).message);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(
      `\n🎉 Database connection test completed successfully in ${duration}ms!`
    );
    console.log("✅ Your database is ready to use.");
  } catch (error) {
    console.error("\n❌ Database connection failed:");
    console.error("Error details:", error);

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED")) {
        console.error(
          "\n💡 Suggestion: Check if your database server is running"
        );
      } else if (error.message.includes("Access denied")) {
        console.error("\n💡 Suggestion: Check your database credentials");
      } else if (error.message.includes("Unknown database")) {
        console.error("\n💡 Suggestion: Check if your database exists");
      } else if (error.message.includes("getaddrinfo ENOTFOUND")) {
        console.error("\n💡 Suggestion: Check your database host/URL");
      }
    }

    console.error("\n🔧 Please check:");
    console.error("   1. DATABASE_URL in your .env file");
    console.error("   2. Database server is running");
    console.error("   3. Database credentials are correct");
    console.error("   4. Database exists and is accessible");

    process.exit(1);
  } finally {
    // Clean up
    console.log("\n🔌 Closing database connection...");
    await prisma.$disconnect();
    console.log("✅ Connection closed successfully");
  }
}

// Environment check
function checkEnvironment() {
  console.log("🔧 Checking environment configuration...\n");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL environment variable is not set!");
    console.error(
      "Please create a .env file with your database connection string."
    );
    console.error(
      'Example: DATABASE_URL="mysql://username:password@localhost:3306/database_name"'
    );
    process.exit(1);
  }

  // Mask sensitive information in URL for logging
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ":****@");
  console.log("✅ DATABASE_URL found:", maskedUrl);
  console.log("");
}

// Main execution
async function main() {
  console.log("🚀 Database Connection Test Tool");
  console.log("================================\n");

  checkEnvironment();
  await testConnection();

  console.log("\n✨ Test completed successfully!");
}

// Run the test
main().catch(error => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
