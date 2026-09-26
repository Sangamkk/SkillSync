/**
 * SkillSync Backend API Test Script
 * Run with: node tests/api.test.js
 * 
 * Note: Server must be running on port 5000
 * Tests do NOT require blockchain — they test the API surface and auth
 */

const fetch = globalThis.fetch;

const BASE_URL = "http://localhost:5000/api";

let studentToken = null;
let orgToken = null;
let adminToken = null;
let studentId = null;
let orgId = null;

const log = (msg, data = null) => {
  const prefix = "  ";
  if (data) {
    console.log(`${prefix}${msg}:`, JSON.stringify(data, null, 2).slice(0, 200));
  } else {
    console.log(`${prefix}${msg}`);
  }
};

const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);

const request = async (method, path, body = null, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

// ─── Test Suites ──────────────────────────────────────────────────────────────

async function testHealth() {
  console.log("\n📋 HEALTH CHECK");
  const { status, data } = await request("GET", "/health");
  if (status === 200 && data.success) {
    pass("API is running");
  } else {
    fail(`Health check failed: ${status}`);
  }
}

async function testPublicVerification() {
  console.log("\n📋 PUBLIC VERIFICATION (unauthenticated)");

  // Test with a non-existent certificate ID
  const { status, data } = await request("GET", "/public/verify/notacertificate");
  if (status === 200 || status === 200) {
    pass(`GET /public/verify/:id returns ${status} (expected 200 with valid/invalid flag)`);
  } else {
    fail(`GET /public/verify/:id returned ${status}`);
  }
}

async function testAuthRoutes() {
  console.log("\n📋 AUTH ROUTES");

  // Test registration with invalid data
  const { status: badStatus } = await request("POST", "/auth/register", {
    email: "invalid",
  });
  if (badStatus === 400 || badStatus === 422) {
    pass("POST /auth/register rejects missing fields");
  } else {
    fail(`Expected 400 for missing fields, got ${badStatus}`);
  }

  // Test login with invalid credentials
  const { status: loginStatus, data: loginData } = await request("POST", "/auth/login", {
    email: "nonexistent@test.com",
    password: "wrongpass",
    role: "STUDENT",
  });
  if (loginStatus === 401) {
    pass("POST /auth/login returns 401 for invalid credentials");
  } else {
    fail(`Expected 401, got ${loginStatus}: ${loginData?.message}`);
  }
}

async function testProtectedRoutes() {
  console.log("\n📋 PROTECTED ROUTES (no auth)");

  const routes = [
    ["GET", "/student/profile"],
    ["GET", "/student/projects"],
    ["GET", "/certificate/my"],
    ["GET", "/verification-requests/my"],
    ["GET", "/organisation/pending"],
    ["GET", "/employment/jobs"],
  ];

  for (const [method, path] of routes) {
    const { status } = await request(method, path);
    if (status === 401) {
      pass(`${method} ${path} → 401 without auth`);
    } else {
      fail(`${method} ${path} → expected 401, got ${status}`);
    }
  }
}

async function testOrganisationApplication() {
  console.log("\n📋 ORGANISATION APPLICATION");

  const { status, data } = await request("POST", "/organisation/apply", {
    organisationName: "Test University",
    email: `testuni_${Date.now()}@test.com`,
    password: "TestPass123!",
    organisationType: "University",
    registrationNumber: `REG_${Date.now()}`,
    website: "https://test.edu",
    description: "A test university for API testing",
  });

  if (status === 201 && data.success) {
    pass(`POST /organisation/apply → 201: ${data.application.organisationName}`);
    orgId = data.application._id;
  } else {
    fail(`POST /organisation/apply → ${status}: ${data.message}`);
  }

  // Duplicate email should fail
  if (orgId) {
    const { status: dupStatus } = await request("POST", "/organisation/apply", {
      organisationName: "Another Org",
      email: "testuni_dup@test.com", // Different email but same reg number
      password: "TestPass123!",
      organisationType: "Company",
      registrationNumber: "REG_DUPLICATE",
    });

    // First create a dup entry to test with
    const { status: firstCreate } = await request("POST", "/organisation/apply", {
      organisationName: "First Org",
      email: "first_org@test.com",
      password: "TestPass123!",
      organisationType: "Company",
      registrationNumber: "REG_FIRST",
    });

    const { status: dupReg } = await request("POST", "/organisation/apply", {
      organisationName: "Dup Reg Org",
      email: "dup_org@test.com",
      password: "TestPass123!",
      organisationType: "Company",
      registrationNumber: "REG_FIRST", // Duplicate registration number
    });

    if (dupReg === 409) {
      pass("Duplicate registration number returns 409");
    } else {
      fail(`Expected 409 for duplicate registration number, got ${dupReg}`);
    }
  }
}

async function testGetVerifiedOrganisations() {
  console.log("\n📋 GET VERIFIED ORGANISATIONS");
  // This needs auth
  const { status, data } = await request("GET", "/organisation/verified", null, "invalid_token");
  if (status === 401) {
    pass("GET /organisation/verified requires auth");
  } else {
    fail(`Expected 401, got ${status}`);
  }
}

async function testNotFoundRoute() {
  console.log("\n📋 NOT FOUND HANDLER");
  const { status } = await request("GET", "/nonexistent/route");
  if (status === 404) {
    pass("Unmatched routes return 404");
  } else {
    fail(`Expected 404, got ${status}`);
  }
}

// ─── Run all tests ────────────────────────────────────────────────────────────

async function runAll() {
  console.log("🧪 SkillSync Backend API Tests\n");

  try {
    await testHealth();
    await testPublicVerification();
    await testAuthRoutes();
    await testProtectedRoutes();
    await testOrganisationApplication();
    await testGetVerifiedOrganisations();
    await testNotFoundRoute();
  } catch (err) {
    console.error("\n❌ Test runner error:", err.message);
  }

  console.log("\n✅ Tests complete\n");
}

runAll();
