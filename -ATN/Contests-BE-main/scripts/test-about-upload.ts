// Test script for About image upload functionality
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Fixed filename path
// const __filename = 'd:\\Codebase\\contest-BE\\scripts\\test-about-upload.ts';
// const __dirname = path.dirname(__filename);

dotenv.config();

const BASE_URL: string = process.env.BASE_URL || 'http://localhost:3000';

// Test credentials (you'll need to adjust these based on your database)
const TEST_USER = {
  identifier: process.env.UsernameAdmin || 'admin', // or username
  password: process.env.PasswordAdmin || 'admin@123',
};

let authToken: string = '';

// --- Interface Definitions ---
interface LoginResponseData {
  accessToken: string;
  // Add other properties from your login response if needed
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface AboutInfo {
  id: string;
  schoolName: string;
  logo?: string;
  banner?: string;
  // Add other properties from your about info if needed
}

async function login(): Promise<boolean> {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post<ApiResponse<LoginResponseData>>(
      `${BASE_URL}/api/auth/login`,
      TEST_USER
    );

    if (response.data.success) {
      // authToken = response.data.data.accessToken;
      console.log('✅ Login successful');
      return true;
    } else {
      console.error('❌ Login failed:', response.data.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<null>>;
    console.error(
      '❌ Login error:',
      axiosError.response?.data?.message || axiosError.message
    );
    return false;
  }
}

async function getAboutInfo(): Promise<string | null> {
  try {
    console.log('📖 Getting About information...');
    const response = await axios.get<ApiResponse<AboutInfo[]>>(`${BASE_URL}/api/about`);

    if (response.data.success && response.data.data && response.data.data.length > 0) {
      const aboutInfo = response.data.data[0];
      console.log('✅ About info retrieved:');
      console.log('   ID:', aboutInfo.id);
      console.log('   Title:', aboutInfo.schoolName);
      console.log('   Logo:', aboutInfo.logo || 'No logo');
      console.log('   Banner:', aboutInfo.banner || 'No banner');
      return aboutInfo.id;
    } else {
      console.error('❌ No About information found');
      return null;
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<null>>;
    console.error(
      '❌ Error getting About info:',
      axiosError.response?.data?.message || axiosError.message
    );
    return null;
  }
}

async function createSampleImage(filename: string): Promise<void> {
  // Create a simple test image (1x1 pixel PNG)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x02, 0x18, 0xdd, 0x8d, 0xb4, 0x1c, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  await fs.promises.writeFile(filename, pngData); // Use async version
  console.log('📷 Created sample image:', filename);
}

async function testImageUpload(aboutId: string): Promise<boolean> {
  try {
    // if (!authToken) {
    //   console.error('❌ No auth token available');
    //   return false;
    // }

    // Create sample images
    const logoPath = path.join("D:\\Codebase\\contest-BE\\uploads\\about\\", 'test-logo.png');
    const bannerPath = path.join("D:\\Codebase\\contest-BE\\uploads\\about\\", 'test-banner.png');

    await createSampleImage(logoPath);
    await createSampleImage(bannerPath);

    console.log('📤 Testing image upload...');

    // Create form data
    const formData = new FormData();
    formData.append('schoolName', 'Olympic Toán học - Updated');
    formData.append('description', 'Updated description with images');
    formData.append('logo', fs.createReadStream(logoPath));
    formData.append('banner', fs.createReadStream(bannerPath));

    const response = await axios.put<ApiResponse<AboutInfo>>(
      `${BASE_URL}/api/about/${aboutId}`,
      formData,
      {
        headers: {
          ...(formData.getHeaders()), // Spread the headers from FormData
          // 'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (response.data.success) {
      console.log('✅ Image upload successful!');
      console.log('   Updated About info:', response.data.data);

      // Clean up test files
      await fs.promises.unlink(logoPath); // Use async version
      await fs.promises.unlink(bannerPath); // Use async version
      console.log('🧹 Cleaned up test files');

      return true;
    } else {
      console.error('❌ Image upload failed:', response.data.message);
      return false;
    }
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<null>>;
    console.error(
      '❌ Image upload error:',
      axiosError.response?.data?.message || axiosError.message
    );
    if (axiosError.response?.data) {
        console.error('Server response data:', axiosError.response.data);
    }
    return false;
  }
}

async function runTests(): Promise<void> {
  console.log('🧪 Starting About Image Upload Tests...\n');

  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Tests failed: Could not login');
    return;
  }

  // Step 2: Get About info
  const aboutId = await getAboutInfo();
  if (!aboutId) {
    console.log('❌ Tests failed: Could not get About information');
    return;
  }

  // Step 3: Test image upload
  const uploadSuccess = await testImageUpload(aboutId);
  if (!uploadSuccess) {
    console.log('❌ Tests failed: Image upload failed');
    return;
  }

  // Step 4: Verify upload by getting updated info
  console.log('\n📋 Verifying upload...');
  await getAboutInfo();

  console.log('\n🎉 All tests completed successfully!');
}

// Instructions for running the test
console.log('📋 About Image Upload Test Instructions:');
console.log('1. Make sure the server is running on http://localhost:3000');
console.log('2. Update TEST_USER credentials in this script if needed (currently using .env)');
console.log('3. Ensure your tsconfig.json and package.json are set up for ES modules.');
console.log('4. Run: npx ts-node your-script-name.ts (or your preferred TS execution method)');
console.log('');

// Uncomment the line below to run the tests
runTests();