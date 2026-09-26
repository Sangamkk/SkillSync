import bcrypt from "bcrypt";
import { ethers } from "ethers";
import OrganisationApplication from "../models/OrganisationApplication.js";
import { organisationRegistry } from "../blockchain/contracts.js";

// ─── ORGANISATION TYPE MAP ────────────────────────────────────────────────────
// Maps from OrganisationType string to Types.OrganizationType enum (0-5)
const ORGANISATION_TYPE_MAP = {
  Company: 0,
  University: 1,
  ResearchLab: 2,
  NGO: 3,
  Government: 4,
  Other: 5,
};

// ─── REGISTER APPLICATION ─────────────────────────────────────────────────────
/**
 * Organisation registration — creates a PENDING application.
 * No blockchain interaction yet — that happens on admin approval.
 */
export const createApplicationService = async (data) => {
  const {
    organisationName,
    email,
    password,
    organisationType,
    registrationNumber,
    website,
    description,
    details,
  } = data;

  if (!organisationName || !email || !organisationType || !registrationNumber) {
    const err = new Error(
      "organisationName, email, organisationType and registrationNumber are required"
    );
    err.statusCode = 400;
    throw err;
  }

  // Use provided password or fallback default for backward compatibility
  const rawPassword = password || data.details?.password || "OrgSecurePass123!";

  const normalizedEmail = email.toLowerCase();

  // Check duplicate email across both collections
  const existingEmail = await OrganisationApplication.findOne({ email: normalizedEmail });
  if (existingEmail) {
    const err = new Error("An organisation with this email already exists.");
    err.statusCode = 409;
    throw err;
  }

  const existingReg = await OrganisationApplication.findOne({
    registrationNumber: registrationNumber.trim(),
  });
  if (existingReg) {
    const err = new Error("An organisation with this registration number already exists.");
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const finalWebsite = website || details?.website || "";
  const finalDescription = description || details?.description || "";

  try {
    const application = await OrganisationApplication.create({
      organisationName: organisationName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      organisationType,
      registrationNumber: registrationNumber.trim(),
      website: finalWebsite,
      description: finalDescription,
      details: details || {},
      status: "Pending",
    });

    const appObj = application.toObject();
    delete appObj.password;

    return appObj;
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      const dupErr = new Error(`This ${field} is already registered.`);
      dupErr.statusCode = 409;
      throw dupErr;
    }
    throw err;
  }
};

// ─── GET PENDING APPLICATIONS ─────────────────────────────────────────────────
export const getPendingApplicationsService = async () => {
  const applications = await OrganisationApplication.find({ status: "Pending" })
    .sort({ createdAt: -1 })
    .lean();

  // Strip passwords
  return applications.map((app) => {
    const { password: _p, ...rest } = app;
    return rest;
  });
};

// ─── APPROVE APPLICATION ──────────────────────────────────────────────────────
/**
 * Admin approves an organisation.
 * Generates a bytes32 organisationId, registers on blockchain,
 * waits for confirmation, then updates MongoDB.
 */
export const approveApplicationService = async (id) => {
  const application = await OrganisationApplication.findById(id);

  if (!application) {
    const err = new Error("Organisation application not found");
    err.statusCode = 404;
    throw err;
  }

  if (application.status !== "Pending") {
    const err = new Error(`Application is already ${application.status}`);
    err.statusCode = 400;
    throw err;
  }

  // Generate a cryptographically random bytes32 organisationId
  const organisationId = ethers.hexlify(ethers.randomBytes(32));

  // Ensure no collision (astronomically unlikely but safe)
  const existingOrg = await OrganisationApplication.findOne({ organisationId });
  if (existingOrg) {
    throw new Error("Organisation ID collision — please try again");
  }

  // Map organisationType to enum value
  const orgTypeEnum = ORGANISATION_TYPE_MAP[application.organisationType] ?? 5;

  console.log(
    `[BLOCKCHAIN] Registering organisation ${organisationId} (${application.organisationType}=${orgTypeEnum})`
  );

  const transaction = await organisationRegistry.registerOrganisation(
    organisationId,
    orgTypeEnum
  );

  console.log(`[BLOCKCHAIN] Transaction submitted: ${transaction.hash}`);

  const receipt = await transaction.wait();

  const blockchainStatus = receipt.status === 1 ? "CONFIRMED" : "FAILED";

  console.log(
    `[BLOCKCHAIN] Organisation registration confirmed: ${receipt.hash}, status: ${blockchainStatus}`
  );

  if (blockchainStatus === "FAILED") {
    throw new Error("Blockchain registration transaction failed");
  }

  application.status = "Approved";
  application.organisationId = organisationId;
  application.txHash = transaction.hash;
  application.blockchainBlockNumber = receipt.blockNumber;
  await application.save();

  const appObj = application.toObject();
  delete appObj.password;

  return {
    application: appObj,
    blockchain: {
      organisationId,
      transactionHash: transaction.hash,
      blockNumber: receipt.blockNumber,
      status: blockchainStatus,
    },
  };
};

// ─── REJECT APPLICATION ───────────────────────────────────────────────────────
export const rejectApplicationService = async (id, rejectionReason) => {
  const application = await OrganisationApplication.findByIdAndUpdate(
    id,
    {
      status: "Rejected",
      rejectionReason: rejectionReason || "Application rejected by admin",
    },
    { new: true }
  ).lean();

  if (!application) {
    const err = new Error("Organisation application not found");
    err.statusCode = 404;
    throw err;
  }

  const { password: _p, ...rest } = application;
  return rest;
};

// ─── GET VERIFIED ORGANISATIONS ───────────────────────────────────────────────
export const getVerifiedOrganisationsService = async () => {
  const organisations = await OrganisationApplication.find(
    { status: "Approved" },
    { password: 0 }
  )
    .sort({ organisationName: 1 })
    .lean();

  return organisations;
};

// ─── GET ORGANISATION PROFILE ─────────────────────────────────────────────────
export const getOrganisationProfileService = async (orgId) => {
  const org = await OrganisationApplication.findById(orgId, { password: 0 }).lean();

  if (!org) {
    const err = new Error("Organisation not found");
    err.statusCode = 404;
    throw err;
  }

  return org;
};