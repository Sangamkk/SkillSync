const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...\n");

  // --------------------------------------------------
  // 1. Applicant Manager
  // --------------------------------------------------

  const ApplicantManager =
    await hre.ethers.getContractFactory("ApplicantManager");

  const applicantManager =
    await ApplicantManager.deploy();

  await applicantManager.waitForDeployment();

  const applicantManagerAddress =
    await applicantManager.getAddress();

  console.log(
    "ApplicantManager:",
    applicantManagerAddress
  );

  // --------------------------------------------------
  // 2. Organisation Registry
  // --------------------------------------------------

  const OrganisationRegistry =
    await hre.ethers.getContractFactory(
      "OrganisationRegistry"
    );

  const organisationRegistry =
    await OrganisationRegistry.deploy();

  await organisationRegistry.waitForDeployment();

  const organisationRegistryAddress =
    await organisationRegistry.getAddress();

  console.log(
    "OrganisationRegistry:",
    organisationRegistryAddress
  );

  // --------------------------------------------------
  // 3. Request Manager
  // --------------------------------------------------

  const RequestManager =
    await hre.ethers.getContractFactory(
      "RequestManager"
    );

  const requestManager =
    await RequestManager.deploy(
      applicantManagerAddress,
      organisationRegistryAddress
    );

  await requestManager.waitForDeployment();

  const requestManagerAddress =
    await requestManager.getAddress();

  console.log(
    "RequestManager:",
    requestManagerAddress
  );

  // --------------------------------------------------
  // 4. Employment Manager
  // --------------------------------------------------

  const EmploymentManager =
    await hre.ethers.getContractFactory(
      "EmploymentManager"
    );

  const employmentManager =
    await EmploymentManager.deploy(
      applicantManagerAddress,
      organisationRegistryAddress
    );

  await employmentManager.waitForDeployment();

  const employmentManagerAddress =
    await employmentManager.getAddress();

  console.log(
    "EmploymentManager:",
    employmentManagerAddress
  );

  // --------------------------------------------------
  // 5. Certificate Manager
  // --------------------------------------------------

  const CertificateManager =
    await hre.ethers.getContractFactory(
      "CertificateManager"
    );

  const certificateManager =
    await CertificateManager.deploy(
      applicantManagerAddress,
      organisationRegistryAddress
    );

  await certificateManager.waitForDeployment();

  const certificateManagerAddress =
    await certificateManager.getAddress();

  console.log(
    "CertificateManager:",
    certificateManagerAddress
  );

  // --------------------------------------------------
  // 6. Wire Manager Contracts
  // --------------------------------------------------

  console.log("\nLinking contracts...\n");

  let tx;

  // ApplicantManager -> RequestManager
  tx = await applicantManager.setRequestManager(
    requestManagerAddress
  );
  await tx.wait();

  console.log("RequestManager linked.");

  // ApplicantManager -> EmploymentManager
  tx = await applicantManager.setEmploymentManager(
    employmentManagerAddress
  );
  await tx.wait();

  console.log("EmploymentManager linked.");

  // ApplicantManager -> CertificateManager
  tx = await applicantManager.setCertificateManager(
    certificateManagerAddress
  );
  await tx.wait();

  console.log("CertificateManager linked.");

  // --------------------------------------------------
  // 7. Verify Wiring
  // --------------------------------------------------

  console.log("\nVerifying contract wiring...\n");

  console.log(
    "RequestManager:",
    await applicantManager.requestManager()
  );

  console.log(
    "EmploymentManager:",
    await applicantManager.employmentManager()
  );

  console.log(
    "CertificateManager:",
    await applicantManager.certificateManager()
  );

  // --------------------------------------------------
  // 8. Deployment Summary
  // --------------------------------------------------

  console.log("\n====================================");
  console.log("       DEPLOYMENT COMPLETE");
  console.log("====================================");

  console.log(
    "ApplicantManager      :",
    applicantManagerAddress
  );

  console.log(
    "OrganisationRegistry   :",
    organisationRegistryAddress
  );

  console.log(
    "RequestManager        :",
    requestManagerAddress
  );

  console.log(
    "EmploymentManager     :",
    employmentManagerAddress
  );

  console.log(
    "CertificateManager    :",
    certificateManagerAddress
  );

  console.log("====================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});