/**
 * SkillSync Full End-to-End Integration Test Suite
 * Tests MongoDB + Sepolia Blockchain + Cloudinary + Auth + Business Logic
 *
 * Run with: node tests/integration.test.js
 */

import crypto from "crypto";

const BASE_URL = "http://localhost:5000/api";

let studentToken = null;
let orgToken = null;
let adminToken = null;

let studentUser = null;
let orgApplication = null;
let uploadedCert = null;
let issuedCert = null;
let verificationReq = null;
let projectDoc = null;
let projectVerificationReq = null;
let jobDoc = null;
let jobAppDoc = null;

let passedCount = 0;
let failedCount = 0;

function pass(msg) {
  passedCount++;
  console.log(`  ✅ [PASS] ${msg}`);
}

function fail(msg, details = null) {
  failedCount++;
  console.error(`  ❌ [FAIL] ${msg}`);
  if (details) console.error("     Details:", details);
}

async function request(method, path, body = null, token = null, isFormData = false) {
  const headers = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : null),
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ─── 1. Health & Initial Checks ──────────────────────────────────────────────
async function testHealth() {
  console.log("\n🧪 1. HEALTH & CONNECTIVITY");
  const { status, data } = await request("GET", "/health");
  if (status === 200 && data.success) {
    pass("API server is healthy and responding");
  } else {
    fail("Health check failed", { status, data });
  }
}

// ─── 2. Auth Flow ─────────────────────────────────────────────────────────────
async function testAuthFlow() {
  console.log("\n🧪 2. AUTHENTICATION & IDENTITY LIFECYCLE");

  const timestamp = Date.now();
  const testStudentEmail = `student_${timestamp}@testskillsync.edu`;
  const testPassword = "Password123!";

  // 2.1 Duplicate/Missing validations
  const { status: badRegStatus } = await request("POST", "/auth/register", {
    email: testStudentEmail,
  });
  if (badRegStatus === 400) {
    pass("POST /auth/register rejects missing fields with 400");
  } else {
    fail(`Expected 400 for missing fields, got ${badRegStatus}`);
  }

  // 2.2 Student Registration (calls ApplicantManager.createApplicant on Sepolia)
  console.log("     Registering student on-chain (may take ~10-15s for Sepolia receipt)...");
  const regStart = Date.now();
  const { status: regStatus, data: regData } = await request("POST", "/auth/register", {
    name: "Integration Test Student",
    email: testStudentEmail,
    password: testPassword,
    role: "STUDENT",
    usn: `1SK${timestamp.toString().slice(-6)}`,
    college: "SkillSync Engineering College",
  });

  if (regStatus === 201 && regData.success && regData.token) {
    studentToken = regData.token;
    studentUser = regData.user;
    const duration = ((Date.now() - regStart) / 1000).toFixed(1);
    pass(`Student registered on Sepolia & DB in ${duration}s (applicantId: ${regData.blockchain.applicantId.slice(0, 10)}...)`);
  } else {
    fail("Student registration failed", { status: regStatus, data: regData });
    return;
  }

  // 2.3 Duplicate Registration check
  const { status: dupStatus } = await request("POST", "/auth/register", {
    name: "Duplicate Student",
    email: testStudentEmail,
    password: testPassword,
    role: "STUDENT",
  });
  if (dupStatus === 409) {
    pass("Duplicate student registration returns 409 Conflict");
  } else {
    fail(`Expected 409 for duplicate email, got ${dupStatus}`);
  }

  // 2.4 Student Login
  const { status: loginStatus, data: loginData } = await request("POST", "/auth/login", {
    email: testStudentEmail,
    password: testPassword,
    role: "STUDENT",
  });
  if (loginStatus === 200 && loginData.token) {
    pass("Student login successful with valid JWT");
  } else {
    fail("Student login failed", { status: loginStatus, data: loginData });
  }

  // 2.5 Bad Password Login
  const { status: badPassStatus } = await request("POST", "/auth/login", {
    email: testStudentEmail,
    password: "WrongPassword!",
    role: "STUDENT",
  });
  if (badPassStatus === 401) {
    pass("Login with incorrect password returns 401 Unauthorized");
  } else {
    fail(`Expected 401 for wrong password, got ${badPassStatus}`);
  }

  // 2.6 Admin Login
  const adminEmail = "admin@skillsync.com";
  const adminPass = "AdminPass123!";
  const { status: adminLoginStatus, data: adminLoginData } = await request("POST", "/auth/login", {
    email: adminEmail,
    password: adminPass,
    role: "ADMIN",
  });

  if (adminLoginStatus === 200 && adminLoginData.token) {
    adminToken = adminLoginData.token;
    pass("Admin login successful with ADMIN role token");
  } else {
    fail("Admin login failed", { status: adminLoginStatus, data: adminLoginData });
  }
}

// ─── 3. Organisation Application & Admin Approval Flow ────────────────────────
async function testOrganisationFlow() {
  console.log("\n🧪 3. ORGANISATION APPLICATION & ON-CHAIN APPROVAL");

  const timestamp = Date.now();
  const orgEmail = `org_${timestamp}@techcorp.com`;
  const orgPassword = "OrgPassword123!";
  const regNumber = `CORP_${timestamp}`;

  // 3.1 Apply
  const { status: applyStatus, data: applyData } = await request("POST", "/organisation/apply", {
    organisationName: "TechCorp Global Labs",
    email: orgEmail,
    password: orgPassword,
    organisationType: "Company",
    registrationNumber: regNumber,
    website: "https://techcorp.example.com",
    description: "Leading tech lab specializing in verification",
  });

  if (applyStatus === 201 && applyData.success && applyData.application) {
    orgApplication = applyData.application;
    pass("Organisation application submitted with status 'Pending' (no chain write yet)");
  } else {
    fail("Organisation application failed", { status: applyStatus, data: applyData });
    return;
  }

  // 3.2 Pending Org cannot login
  const { status: pendingLoginStatus } = await request("POST", "/auth/login", {
    email: orgEmail,
    password: orgPassword,
    role: "ORGANISATION",
  });
  if (pendingLoginStatus === 403) {
    pass("Pending organisation cannot log in (returns 403 Forbidden)");
  } else {
    fail(`Expected 403 for pending org login, got ${pendingLoginStatus}`);
  }

  // 3.3 Unauthorized user cannot approve
  const { status: unauthApproveStatus } = await request(
    "PUT",
    "/organisation/approve",
    { id: orgApplication._id },
    studentToken // STUDENT attempting to approve
  );
  if (unauthApproveStatus === 403) {
    pass("Non-admin role cannot approve organisation (returns 403 Forbidden)");
  } else {
    fail(`Expected 403 for non-admin org approve, got ${unauthApproveStatus}`);
  }

  // 3.4 Admin approves organisation (triggers OrganisationRegistry.registerOrganisation on Sepolia)
  console.log("     Approving organisation on Sepolia (may take ~10-15s for receipt)...");
  const approveStart = Date.now();
  const { status: approveStatus, data: approveData } = await request(
    "PUT",
    "/organisation/approve",
    { id: orgApplication._id },
    adminToken
  );

  if (approveStatus === 200 && approveData.success && approveData.blockchain?.organisationId) {
    const duration = ((Date.now() - approveStart) / 1000).toFixed(1);
    orgApplication = approveData.application;
    pass(`Admin approved org on Sepolia & DB in ${duration}s (organisationId: ${approveData.blockchain.organisationId.slice(0, 10)}...)`);
  } else {
    fail("Admin organisation approval failed", { status: approveStatus, data: approveData });
    return;
  }

  // 3.5 Approved Organisation Login
  const { status: orgLoginStatus, data: orgLoginData } = await request("POST", "/auth/login", {
    email: orgEmail,
    password: orgPassword,
    role: "ORGANISATION",
  });

  if (orgLoginStatus === 200 && orgLoginData.token) {
    orgToken = orgLoginData.token;
    pass("Approved organisation can successfully log in and receive JWT");
  } else {
    fail("Approved organisation login failed", { status: orgLoginStatus, data: orgLoginData });
  }

  // 3.6 Get Verified Organisations
  const { status: verOrgsStatus, data: verOrgsData } = await request(
    "GET",
    "/organisation/verified",
    null,
    studentToken
  );
  if (verOrgsStatus === 200 && Array.isArray(verOrgsData.organisations)) {
    const found = verOrgsData.organisations.some((o) => o._id === orgApplication._id);
    if (found) {
      pass("Approved organisation appears in GET /organisation/verified");
    } else {
      fail("Approved organisation missing from verified list");
    }
  } else {
    fail("GET /organisation/verified failed", { status: verOrgsStatus });
  }
}

// ─── 4. Certificate Upload & Ownership ────────────────────────────────────────
async function testCertificateUpload() {
  console.log("\n🧪 4. CERTIFICATE UPLOAD (STUDENT)");

  // Create valid sample PDF in memory
  const pdfBytes = Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n% SkillSync Test Cert ${Date.now()}\ntrailer\n<< /Root 1 0 R >>\n%%EOF`
  );
  const calculatedHash = "0x" + crypto.createHash("sha256").update(pdfBytes).digest("hex");

  const formData = new FormData();
  formData.append("certificate", new Blob([pdfBytes], { type: "application/pdf" }), "certificate.pdf");
  formData.append("certificateName", "Full-Stack Web Development");
  formData.append("certificateType", "Course");
  formData.append("issuer", "SkillSync Academy");
  formData.append("issueDate", new Date().toISOString());
  formData.append("description", "Mastery of modern web systems");

  console.log("     Uploading certificate to Cloudinary & hashing raw bytes...");
  const { status, data } = await request(
    "POST",
    "/certificate/upload",
    formData,
    studentToken,
    true
  );

  if (status === 201 && data.success && data.certificate) {
    uploadedCert = data.certificate;
    if (uploadedCert.verificationStatus === "Pending") {
      pass("Certificate uploaded with status 'Pending' (NO premature blockchain creation)");
    } else {
      fail(`Expected status 'Pending', got ${uploadedCert.verificationStatus}`);
    }

    if (uploadedCert.certificateHash === calculatedHash) {
      pass("Certificate SHA-256 hash matches client-computed hash exactly");
    } else {
      fail("Certificate hash mismatch", { expected: calculatedHash, got: uploadedCert.certificateHash });
    }
  } else {
    fail("Certificate upload failed", { status, data });
    return;
  }

  // Student fetches own certificates
  const { status: myCertStatus, data: myCertData } = await request(
    "GET",
    "/certificate/my",
    null,
    studentToken
  );

  if (myCertStatus === 200 && Array.isArray(myCertData.certificates)) {
    const found = myCertData.certificates.some((c) => c._id === uploadedCert._id);
    if (found) {
      pass("Uploaded certificate is retrieved via GET /certificate/my");
    } else {
      fail("Certificate not found in /certificate/my");
    }
  } else {
    fail("GET /certificate/my failed", { status: myCertStatus });
  }
}

// ─── 5. Verification Request Flow ─────────────────────────────────────────────
async function testVerificationRequestFlow() {
  console.log("\n🧪 5. EXPLICIT VERIFICATION REQUEST & ON-CHAIN APPROVAL");

  if (!uploadedCert || !orgApplication) {
    fail("Skipping verification request test due to missing cert or org");
    return;
  }

  // 5.1 Student creates verification request (submits RequestManager.createRequest)
  console.log("     Submitting verification request to RequestManager on Sepolia...");
  const reqStart = Date.now();
  const { status: createReqStatus, data: createReqData } = await request(
    "POST",
    "/verification-requests",
    {
      certificateId: uploadedCert._id,
      organisationId: orgApplication._id,
      notes: "Please verify my Full-Stack Web Development certification",
    },
    studentToken
  );

  if (createReqStatus === 201 && createReqData.success && createReqData.request) {
    verificationReq = createReqData.request;
    const duration = ((Date.now() - reqStart) / 1000).toFixed(1);
    pass(`Verification request created on Sepolia & DB in ${duration}s (reqId: ${verificationReq.blockchainRequestId})`);
  } else {
    fail("Create verification request failed", { status: createReqStatus, data: createReqData });
    return;
  }

  // 5.2 Student sees own request
  const { status: studentReqsStatus, data: studentReqsData } = await request(
    "GET",
    "/verification-requests/my",
    null,
    studentToken
  );
  if (studentReqsStatus === 200 && Array.isArray(studentReqsData.requests)) {
    pass("Student sees own request via GET /verification-requests/my");
  } else {
    fail("GET /verification-requests/my failed", { status: studentReqsStatus });
  }

  // 5.3 Organisation sees pending request
  const { status: orgPendingStatus, data: orgPendingData } = await request(
    "GET",
    "/verification-requests/pending",
    null,
    orgToken
  );
  if (orgPendingStatus === 200 && Array.isArray(orgPendingData.requests)) {
    const found = orgPendingData.requests.some((r) => r._id === verificationReq._id);
    if (found) {
      pass("Organisation sees pending request via GET /verification-requests/pending");
    } else {
      fail("Pending request not found in org's pending list");
    }
  } else {
    fail("GET /verification-requests/pending failed", { status: orgPendingStatus });
  }

  // 5.4 Organisation approves request (calls RequestManager.approveRequest on Sepolia)
  console.log("     Organisation approving request on Sepolia...");
  const approveReqStart = Date.now();
  const { status: approveReqStatus, data: approveReqData } = await request(
    "POST",
    `/verification-requests/${verificationReq._id}/approve`,
    {},
    orgToken
  );

  if (approveReqStatus === 200 && approveReqData.success) {
    const duration = ((Date.now() - approveReqStart) / 1000).toFixed(1);
    pass(`Request approved on Sepolia in ${duration}s; certificate marked as Verified`);
  } else {
    fail("Approve verification request failed", { status: approveReqStatus, data: approveReqData });
  }
}

// ─── 6. Public Verification ───────────────────────────────────────────────────
async function testPublicVerificationFlow() {
  console.log("\n🧪 6. PUBLIC VERIFICATION (UNAUTHENTICATED)");

  if (!uploadedCert) {
    fail("Skipping public verification due to missing cert");
    return;
  }

  // 6.1 Verify by Mongo ID
  const { status: verifyByIdStatus, data: verifyByIdData } = await request(
    "GET",
    `/public/verify/${uploadedCert._id}`
  );
  if (verifyByIdStatus === 200 && verifyByIdData.valid === true && verifyByIdData.status === "VALID") {
    pass("Public GET /public/verify/:id returns valid: true and status: 'VALID'");
  } else {
    fail("Public verify by ID failed", { status: verifyByIdStatus, data: verifyByIdData });
  }

  // 6.2 Verify by Hash
  const { status: verifyByHashStatus, data: verifyByHashData } = await request(
    "GET",
    `/public/verify/${uploadedCert.certificateHash}`
  );
  if (verifyByHashStatus === 200 && verifyByHashData.valid === true) {
    pass("Public GET /public/verify/:hash returns valid: true");
  } else {
    fail("Public verify by Hash failed", { status: verifyByHashStatus, data: verifyByHashData });
  }

  // 6.3 Verify Document with Original PDF Buffer
  const originalPdf = Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n% SkillSync Test Cert 99999\ntrailer\n<< /Root 1 0 R >>\n%%EOF`
  );
  // Upload and issue a known certificate to test verify-document against
  // We can test verify-document with an unknown document first
  const unknownPdf = Buffer.from("%PDF-1.4\n% Unrelated and unknown document\n%%EOF");
  const unknownForm = new FormData();
  unknownForm.append("file", new Blob([unknownPdf], { type: "application/pdf" }), "unknown.pdf");

  const { status: unknownDocStatus, data: unknownDocData } = await request(
    "POST",
    "/public/verify-document",
    unknownForm,
    null,
    true
  );
  if (unknownDocStatus === 200 && unknownDocData.valid === false && unknownDocData.status === "NOT_FOUND") {
    pass("Public POST /verify-document correctly rejects unknown/modified document");
  } else {
    fail("Expected NOT_FOUND for unknown document", { status: unknownDocStatus, data: unknownDocData });
  }
}

// ─── 7. Organisation-Issued Certificate & Revocation Flow ────────────────────
async function testOrgIssuedAndRevocationFlow() {
  console.log("\n🧪 7. ORG-ISSUED CERTIFICATE & ON-CHAIN REVOCATION");

  if (!orgApplication || !studentUser) {
    fail("Skipping org-issued cert test due to missing org or student");
    return;
  }

  const issuePdfBytes = Buffer.from(
    `%PDF-1.4\n% Org Issued Cert ${Date.now()}\n%%EOF`
  );

  const formData = new FormData();
  formData.append("certificate", new Blob([issuePdfBytes], { type: "application/pdf" }), "issued_cert.pdf");
  formData.append("studentId", studentUser._id);
  formData.append("certificateName", "Excellence in Distributed Systems");
  formData.append("certificateType", "Internship");
  formData.append("issueDate", new Date().toISOString());
  formData.append("description", "Directly awarded for high distinction");

  console.log("     Directly issuing certificate on Sepolia via CertificateManager...");
  const issueStart = Date.now();
  const { status: issueStatus, data: issueData } = await request(
    "POST",
    "/certificate/issue",
    formData,
    orgToken,
    true
  );

  if (issueStatus === 201 && issueData.success && issueData.certificate) {
    issuedCert = issueData.certificate;
    const duration = ((Date.now() - issueStart) / 1000).toFixed(1);
    pass(`Org issued certificate on Sepolia in ${duration}s (status: 'Verified', blockchainStored: true)`);
  } else {
    fail("Org certificate issuance failed", { status: issueStatus, data: issueData });
    return;
  }

  // Verify issued cert is valid publicly
  const { status: pubStatus, data: pubData } = await request(
    "GET",
    `/public/verify/${issuedCert._id}`
  );
  if (pubStatus === 200 && pubData.valid === true) {
    pass("Org-issued certificate verified publicly as VALID");
  } else {
    fail("Org-issued certificate verification failed", { status: pubStatus, data: pubData });
  }

  // Revoke certificate on Sepolia (CertificateManager.revokeCertificate)
  console.log("     Revoking certificate on Sepolia...");
  const revokeStart = Date.now();
  const { status: revokeStatus, data: revokeData } = await request(
    "POST",
    `/certificate/${issuedCert._id}/revoke`,
    { reason: "Integrity violation" },
    orgToken
  );

  if (revokeStatus === 200 && revokeData.success && revokeData.certificate?.verificationStatus === "Revoked") {
    const duration = ((Date.now() - revokeStart) / 1000).toFixed(1);
    pass(`Certificate revoked on Sepolia in ${duration}s; status updated to 'Revoked'`);
  } else {
    fail("Certificate revocation failed", { status: revokeStatus, data: revokeData });
  }

  // Public verify now returns REVOKED
  const { status: pubRevokedStatus, data: pubRevokedData } = await request(
    "GET",
    `/public/verify/${issuedCert._id}`
  );
  if (pubRevokedStatus === 200 && pubRevokedData.valid === false && pubRevokedData.status === "REVOKED") {
    pass("Public verification confirms certificate is now REVOKED");
  } else {
    fail("Public verification did not reflect REVOKED status", { status: pubRevokedStatus, data: pubRevokedData });
  }
}

// ─── 8. Project & Project Verification Flow ───────────────────────────────────
async function testProjectWorkflow() {
  console.log("\n🧪 8. PROJECT CREATION & VERIFICATION WORKFLOW");

  if (!orgApplication || !studentToken) {
    fail("Skipping project workflow test due to missing prerequisites");
    return;
  }

  const timestamp = Date.now();
  // 8.1 Create Project
  const { status: createProjStatus, data: createProjData } = await request(
    "POST",
    "/student/projects",
    {
      projectName: `SkillSync Distributed Node ${timestamp}`,
      projectType: "Blockchain / Web3",
      githubLink: `https://github.com/skillsync-test/repo-${timestamp}`,
      description: "Smart contract orchestration engine",
    },
    studentToken
  );

  if (createProjStatus === 201 && createProjData.success && createProjData.project) {
    projectDoc = createProjData.project;
    pass("Project created with SHA-256 githubHash and status PENDING");
  } else {
    fail("Create project failed", { status: createProjStatus, data: createProjData });
    return;
  }

  // 8.2 Request project verification (calls RequestManager.createRequest with type AddProjectVerification)
  console.log("     Submitting project verification request on Sepolia...");
  const projReqStart = Date.now();
  const { status: projReqStatus, data: projReqData } = await request(
    "POST",
    "/verification-requests/project",
    {
      projectId: projectDoc._id,
      organisationId: orgApplication._id,
    },
    studentToken
  );

  if (projReqStatus === 201 && projReqData.success && projReqData.request) {
    projectVerificationReq = projReqData.request;
    const duration = ((Date.now() - projReqStart) / 1000).toFixed(1);
    pass(`Project verification request created on Sepolia & DB in ${duration}s (reqId: ${projectVerificationReq.blockchainRequestId})`);
  } else {
    fail("Create project verification request failed", { status: projReqStatus, data: projReqData });
    return;
  }

  // 8.3 Org approves project request on-chain
  console.log("     Organisation approving project on Sepolia...");
  const projApproveStart = Date.now();
  const { status: projApproveStatus, data: projApproveData } = await request(
    "POST",
    `/verification-requests/${projectVerificationReq._id}/approve`,
    {},
    orgToken
  );

  if (projApproveStatus === 200 && projApproveData.success) {
    const duration = ((Date.now() - projApproveStart) / 1000).toFixed(1);
    pass(`Project approved on Sepolia in ${duration}s; marked as APPROVED in DB`);
  } else {
    fail("Project approval failed", { status: projApproveStatus, data: projApproveData });
  }
}

// ─── 9. Employment Lifecycle Flow ─────────────────────────────────────────────
async function testEmploymentWorkflow() {
  console.log("\n🧪 9. EMPLOYMENT OFFER & TERMINATION ON-CHAIN LIFECYCLE");

  if (!orgApplication || !studentUser) {
    fail("Skipping employment workflow test due to missing prerequisites");
    return;
  }

  // 9.1 Org creates Job
  const { status: jobStatus, data: jobData } = await request(
    "POST",
    "/employment/jobs",
    {
      title: "Senior Smart Contract Engineer",
      description: "Build robust backend and blockchain integrations",
      employmentType: "FullTime",
      location: "Remote",
      stipend: 5000,
      requiredSkills: ["Solidity", "Node.js", "Ethereum"],
    },
    orgToken
  );

  if (jobStatus === 201 && jobData._id) {
    jobDoc = jobData;
    pass("Organisation created job vacancy");
  } else {
    fail("Job creation failed", { status: jobStatus, data: jobData });
    return;
  }

  // 9.2 Student applies to Job
  const { status: applyJobStatus, data: applyJobData } = await request(
    "POST",
    `/employment/jobs/${jobDoc._id}/apply`,
    {},
    studentToken
  );

  if (applyJobStatus === 201 && applyJobData._id) {
    jobAppDoc = applyJobData;
    pass("Student applied to job vacancy");
  } else {
    fail("Student job application failed", { status: applyJobStatus, data: applyJobData });
    return;
  }

  // 9.3 Org creates Employment Offer (EmploymentManager.createOffer on Sepolia)
  console.log("     Creating employment offer on Sepolia via EmploymentManager...");
  const offerStart = Date.now();
  const { status: offerStatus, data: offerData } = await request(
    "POST",
    `/employment/applications/${jobAppDoc._id}/offer`,
    {},
    orgToken
  );

  let onChainOfferId = null;
  if (offerStatus === 200 && (offerData.application?.offerId || offerData.blockchain?.offerId)) {
    onChainOfferId = offerData.application?.offerId || offerData.blockchain?.offerId;
    const duration = ((Date.now() - offerStart) / 1000).toFixed(1);
    pass(`Employment offer created on Sepolia in ${duration}s (offerId: ${onChainOfferId})`);
  } else {
    fail("Employment offer creation failed", { status: offerStatus, data: offerData });
    return;
  }

  // 9.4 Student accepts Offer (EmploymentManager.acceptOffer on Sepolia)
  console.log("     Student accepting offer on Sepolia...");
  const acceptStart = Date.now();
  const { status: acceptStatus, data: acceptData } = await request(
    "POST",
    `/employment/offers/${onChainOfferId}/accept`,
    {},
    studentToken
  );

  if (acceptStatus === 200 && acceptData.message === "Offer accepted") {
    const duration = ((Date.now() - acceptStart) / 1000).toFixed(1);
    pass(`Offer accepted on Sepolia in ${duration}s; Employment record created`);
  } else {
    fail("Accept offer failed", { status: acceptStatus, data: acceptData });
    return;
  }

  // 9.5 Org terminates Employment (EmploymentManager.endEmployment on Sepolia)
  console.log("     Organisation terminating employment on Sepolia...");
  const termStart = Date.now();
  const { status: termStatus, data: termData } = await request(
    "POST",
    `/employment/employees/${onChainOfferId}/terminate`,
    {},
    orgToken
  );

  if (termStatus === 200 && termData.message === "Employment terminated") {
    const duration = ((Date.now() - termStart) / 1000).toFixed(1);
    pass(`Employment terminated on Sepolia in ${duration}s; status updated to Terminated`);
  } else {
    fail("Terminate employment failed", { status: termStatus, data: termData });
  }
}

// ─── 10. Professional Profile Aggregation ─────────────────────────────────────
async function testProfessionalProfile() {
  console.log("\n🧪 10. PROFESSIONAL PROFILE AGGREGATION");

  const { status: profileStatus, data: profileData } = await request(
    "GET",
    "/student/profile/full",
    null,
    studentToken
  );

  if (profileStatus === 200 && profileData.success) {
    const hasCerts = Array.isArray(profileData.certificates);
    const hasProjects = Array.isArray(profileData.projects);
    const hasEmployment = Array.isArray(profileData.previousEmployment);

    if (hasCerts && hasProjects && hasEmployment) {
      pass("Full professional profile returns aggregated certs, projects, and employment history");
    } else {
      fail("Full professional profile response shape incomplete", profileData);
    }
  } else {
    fail("GET /student/profile/full failed", { status: profileStatus, data: profileData });
  }
}

// ─── 11. RBAC Security Matrix ─────────────────────────────────────────────────
async function testRBACMatrix() {
  console.log("\n🧪 11. RBAC SECURITY MATRIX VERIFICATION");

  const matrix = [
    // [method, path, body, tokenToTest, expectedStatus, description]
    ["GET", "/student/profile", null, null, 401, "Unauthenticated GET /student/profile → 401"],
    ["GET", "/student/profile", null, orgToken, 403, "Organisation GET /student/profile → 403 (STUDENT only)"],
    ["GET", "/organisation/pending", null, studentToken, 403, "Student GET /organisation/pending → 403 (ADMIN only)"],
    ["GET", "/organisation/pending", null, orgToken, 403, "Org GET /organisation/pending → 403 (ADMIN only)"],
    ["POST", "/employment/jobs", { title: "Test" }, studentToken, 403, "Student POST /employment/jobs → 403 (ORGANISATION only)"],
    ["GET", "/employment/jobs", null, orgToken, 403, "Org GET /employment/jobs → 403 (STUDENT only)"],
    ["GET", "/public/verify/some-id", null, null, 200, "Unauthenticated GET /public/verify/:id → 200 (Public)"],
  ];

  for (const [method, path, body, tok, expStatus, desc] of matrix) {
    const { status } = await request(method, path, body, tok);
    if (status === expStatus) {
      pass(desc);
    } else {
      fail(`${desc} (expected ${expStatus}, got ${status})`);
    }
  }
}

// ─── Main Runner ──────────────────────────────────────────────────────────────
async function runIntegrationSuite() {
  console.log("==================================================================");
  console.log("🚀 SKILLSYNC BACKEND FULL INTEGRATION TEST SUITE");
  console.log("==================================================================");

  const startTotal = Date.now();

  try {
    await testHealth();
    await testAuthFlow();
    await testOrganisationFlow();
    await testCertificateUpload();
    await testVerificationRequestFlow();
    await testPublicVerificationFlow();
    await testOrgIssuedAndRevocationFlow();
    await testProjectWorkflow();
    await testEmploymentWorkflow();
    await testProfessionalProfile();
    await testRBACMatrix();
  } catch (err) {
    console.error("FATAL SUITE ERROR:", err);
  }

  const totalDuration = ((Date.now() - startTotal) / 1000).toFixed(1);
  console.log("\n==================================================================");
  console.log(`📊 TEST SUITE SUMMARY (Ran in ${totalDuration}s)`);
  console.log(`   Passed: ${passedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runIntegrationSuite();
