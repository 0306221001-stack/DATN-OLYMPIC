# Database Connection Test

This directory contains tools to test your database connection and verify that everything is working correctly.

## Available Test Scripts

### 1. Quick Connection Test
```bash
npm run test:db-connection
```
This runs a simple, fast test to verify your database connection is working. Perfect for quick checks.

### 2. Comprehensive Database Test
```bash
npm run test:db-full
```
This runs a comprehensive test that checks:
- Basic database connection
- Database information retrieval
- Table existence and operations
- Transaction functionality
- Connection pool testing

## Files

- **`scripts/test-db-connection.ts`** - Simple, standalone database connection test
- **`src/tests/database-connection.test.ts`** - Comprehensive database test with multiple checks

## What These Tests Check

1. **Connection Establishment** - Verifies that the app can connect to the database
2. **Environment Configuration** - Checks that DATABASE_URL is properly set
3. **Database Accessibility** - Ensures the database exists and is accessible
4. **Schema Validation** - Checks that tables exist and are accessible
5. **Query Execution** - Tests that queries can be executed successfully
6. **Transaction Support** - Verifies transaction functionality
7. **Connection Pool** - Tests concurrent query execution

## Common Issues and Solutions

### Connection Refused (ECONNREFUSED)
- Check if your database server is running
- Verify the port number in your DATABASE_URL

### Access Denied
- Check your database username and password
- Verify user permissions

### Unknown Database
- Ensure the database exists
- Check the database name in your DATABASE_URL

### DNS/Host Issues (ENOTFOUND)
- Verify the database host/URL
- Check your network connection

## Environment Setup

Make sure you have a `.env` file with your database connection string:

```env
DATABASE_URL="mysql://username:password@localhost:3306/database_name"
```

## Running Tests

Before running these tests, ensure:
1. Your database server is running
2. Your `.env` file is configured correctly
3. Your database exists and is accessible
4. You have run `npm install` to install dependencies

## Integration with CI/CD

These tests can be integrated into your CI/CD pipeline to ensure database connectivity before deployment:

```yaml
# Example GitHub Actions step
- name: Test Database Connection
  run: npm run test:db-connection
```
