
import axios from 'axios';

const GHL_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6ImNxeEZQem5xNUhLUEdCek93UnZDIiwidmVyc2lvbiI6MSwiaWF0IjoxNzYxMDc5MzQxMzg1LCJzdWIiOiJVRnNUTmc0d0hyNVBHcHY1Z2NZZCJ9.zp_TZnk31H9cGxvY85TC4_lzfchmniLwOVkuzaGHd9w";
const LOCATION_ID = "cqxFPznq5HKPGBzOwRvC";

// Diagnostic function
async function testGHL(token: any, version: any, includeLocationId: any) {
    console.log(`Testing with Token: ${token.slice(0, 10)}..., Version: ${version}, LocationId: ${includeLocationId}`);
    try {
        const response = await axios.get(
            'https://services.leadconnectorhq.com/opportunities/pipelines',
            {
                params: includeLocationId ? { locationId: LOCATION_ID } : {},
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(version ? { 'Version': version } : {}),
                },
            }
        );
        console.log(`✅ Success! Found ${response.data.pipelines?.length} pipelines.`);
        return true;
    } catch (error: any) {
        console.log(`❌ Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
        return false;
    }
}

async function runDiagnostics() {
    console.log("--- GHL API DIAGNOSTICS ---");

    // Test 1: Standard JWT from .env
    await testGHL(GHL_JWT, '2021-07-28', true);

    // Test 2: Standard JWT without Version (to see behavior)
    await testGHL(GHL_JWT, null, true);

    console.log("\nNote: Please paste the PIT token you are using below to test (if you were the user)");
}

runDiagnostics();
