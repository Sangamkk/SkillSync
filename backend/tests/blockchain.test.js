import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

import {
  provider,
  adminWallet,
  applicantManager,
  organisationRegistry,
  certificateManager,
  employmentManager,
  requestManager,
} from "../blockchain/contracts.js";

async function testBlockchain() {
  console.log("🔗 BLOCKCHAIN CONNECTIVITY & CONTRACT VALIDATION TEST\n");

  let allPassed = true;

  try {
    // 1. Network check
    const network = await provider.getNetwork();
    console.log(`  ✅ Network connected: ${network.name} (Chain ID: ${network.chainId})`);
    if (network.chainId !== 11155111n) {
      console.warn(`  ⚠️ Warning: Expected Sepolia (11155111), got ${network.chainId}`);
    }

    // 2. Wallet check
    const address = await adminWallet.getAddress();
    const balance = await provider.getBalance(address);
    console.log(`  ✅ Admin Wallet Address: ${address}`);
    console.log(`  ✅ Admin Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error("  ❌ Admin wallet has 0 balance! Cannot execute transactions.");
      allPassed = false;
    }

    // 3. Contract code & owner checks
    const contracts = [
      { name: "ApplicantManager", instance: applicantManager, address: process.env.APPLICANT_MANAGER_ADDRESS },
      { name: "OrganisationRegistry", instance: organisationRegistry, address: process.env.ORGANISATION_REGISTRY_ADDRESS },
      { name: "CertificateManager", instance: certificateManager, address: process.env.CERTIFICATE_MANAGER_ADDRESS },
      { name: "EmploymentManager", instance: employmentManager, address: process.env.EMPLOYMENT_MANAGER_ADDRESS },
      { name: "RequestManager", instance: requestManager, address: process.env.REQUEST_MANAGER_ADDRESS },
    ];

    for (const { name, instance, address: contractAddress } of contracts) {
      if (!contractAddress || contractAddress === ethers.ZeroAddress) {
        console.error(`  ❌ ${name}: Invalid address ${contractAddress}`);
        allPassed = false;
        continue;
      }

      const code = await provider.getCode(contractAddress);
      if (!code || code === "0x") {
        console.error(`  ❌ ${name}: No bytecode at ${contractAddress}`);
        allPassed = false;
        continue;
      }

      console.log(`  ✅ ${name}: Bytecode exists at ${contractAddress}`);

      // Verify owner
      try {
        const owner = await instance.owner();
        const isOwner = owner.toLowerCase() === address.toLowerCase();
        if (isOwner) {
          console.log(`     ✅ Owner matches admin wallet (${owner.slice(0, 8)}...)`);
        } else {
          console.error(`     ❌ Owner mismatch: contract owner is ${owner}, admin wallet is ${address}`);
          allPassed = false;
        }
      } catch (err) {
        console.error(`     ❌ Failed to query owner on ${name}: ${err.message}`);
        allPassed = false;
      }
    }

    // 4. Contract link checks on ApplicantManager
    try {
      const amReqMgr = await applicantManager.requestManager();
      const amCertMgr = await applicantManager.certificateManager();
      const amEmpMgr = await applicantManager.employmentManager();
      console.log(`  ✅ ApplicantManager links:`);
      console.log(`     RequestManager:     ${amReqMgr}`);
      console.log(`     CertificateManager: ${amCertMgr}`);
      console.log(`     EmploymentManager:  ${amEmpMgr}`);
    } catch (err) {
      console.warn(`     ⚠️ ApplicantManager helper check: ${err.message}`);
    }

    if (allPassed) {
      console.log("\n🎉 ALL BLOCKCHAIN CHECKS PASSED!\n");
    } else {
      console.log("\n⚠️ SOME BLOCKCHAIN CHECKS FAILED. Review errors above.\n");
    }
  } catch (error) {
    console.error("❌ Fatal blockchain test error:", error);
    process.exit(1);
  }
}

testBlockchain();
