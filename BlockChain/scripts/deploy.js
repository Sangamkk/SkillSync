const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...\n");

  // ---------------- Applicant Manager ----------------

  const ApplicantManager = await hre.ethers.getContractFactory(
    "ApplicantManager"
  );

  const applicantManager = await ApplicantManager.deploy();

  await applicantManager.waitForDeployment();

  const applicantManagerAddress =
    await applicantManager.getAddress();

  console.log(
    "ApplicantManager:",
    applicantManagerAddress
  );

  // ---------------- Organisation Registry ----------------

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

  // ---------------- Request Manager ----------------

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

  // ---------------- Employment Manager ----------------

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

  // ---------------- Wiring Contracts ----------------

  console.log("\nLinking contracts...\n");

  let tx;

  tx = await applicantManager.setRequestManager(
    requestManagerAddress
  );
  await tx.wait();

  tx = await applicantManager.setEmploymentManager(
    employmentManagerAddress
  );
  await tx.wait();

  console.log("Contracts linked successfully.\n");

  console.log("====================================");

  console.log("ApplicantManager :", applicantManagerAddress);

  console.log(
    "OrganisationRegistry :",
    organisationRegistryAddress
  );

  console.log("RequestManager :", requestManagerAddress);

  console.log(
    "EmploymentManager :",
    employmentManagerAddress
  );

  console.log("====================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});