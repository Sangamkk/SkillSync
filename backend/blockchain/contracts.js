import { ethers } from "ethers";
import dotenv from "dotenv";

import ApplicantManagerABI from "./abis/ApplicantManager.json" with { type: "json" };
import OrganisationRegistryABI from "./abis/OrganisationRegistry.json" with { type: "json" };
import CertificateManagerABI from "./abis/CertificateManager.json" with { type: "json" };
import EmploymentManagerABI from "./abis/EmploymentManager.json" with { type: "json" };
import RequestManagerABI from "./abis/RequestManager.json" with { type: "json" };

dotenv.config();

const provider = new ethers.JsonRpcProvider(
  process.env.BLOCKCHAIN_RPC_URL || process.env.RPC_URL
);

const adminWallet = new ethers.Wallet(
  process.env.ADMIN_PRIVATE_KEY || process.env.BLOCKCHAIN_PRIVATE_KEY,
  provider
);

export const applicantManager = new ethers.Contract(
  process.env.APPLICANT_MANAGER_ADDRESS,
  ApplicantManagerABI.abi,
  adminWallet
);

export const organisationRegistry = new ethers.Contract(
  process.env.ORGANISATION_REGISTRY_ADDRESS,
  OrganisationRegistryABI.abi,
  adminWallet
);

export const certificateManager = new ethers.Contract(
  process.env.CERTIFICATE_MANAGER_ADDRESS,
  CertificateManagerABI.abi,
  adminWallet
);

export const employmentManager = new ethers.Contract(
  process.env.EMPLOYMENT_MANAGER_ADDRESS,
  EmploymentManagerABI.abi,
  adminWallet
);

export const requestManager = new ethers.Contract(
  process.env.REQUEST_MANAGER_ADDRESS,
  RequestManagerABI.abi,
  adminWallet
);

export { provider, adminWallet };