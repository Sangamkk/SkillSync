import bcrypt from "bcrypt";
import { ethers } from "ethers";
import User from "../models/User.js";
import OrganisationApplication from "../models/OrganisationApplication.js";
import { generateToken } from "../utils/jwt.js";
import { applicantManager } from "../blockchain/contracts.js";

// ─── STUDENT REGISTRATION ─────────────────────────────────────────────────────

export const register = async (userData) => {
  const {
    name,
    email,
    password,
    role,
    usn,
    college,
    organizationName,
    companyName,
    digiLockerVerified,
  } = userData;

  if (!name || !email || !password) {
    const err = new Error("name, email and password are required");
    err.statusCode = 400;
    throw err;
  }

  if (role !== "STUDENT") {
    const err = new Error("Only STUDENT registration is allowed via this endpoint");
    err.statusCode = 400;
    throw err;
  }

  // Duplicate email check across both tables
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const err = new Error("Email already exists");
    err.statusCode = 409;
    throw err;
  }

  const existingOrg = await OrganisationApplication.findOne({ email: email.toLowerCase() });
  if (existingOrg) {
    const err = new Error("Email already exists");
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate a cryptographically random bytes32 applicantId
  // This MUST be random — never derived from email, ObjectId, or wallet
  const applicantId = ethers.hexlify(ethers.randomBytes(32));

  // Ensure uniqueness in DB
  const existingApplicant = await User.findOne({ applicantId });
  if (existingApplicant) {
    // Astronomically unlikely but handle it
    throw new Error("Applicant ID collision — please try again");
  }

  let user = null;

  try {
    // Create MongoDB user first (with PENDING blockchain status)
    user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "STUDENT",
      usn: usn || "",
      college: college || "",
      organizationName: organizationName || "",
      companyName: companyName || "",
      digiLockerVerified: digiLockerVerified || false,
      applicantId,
      blockchainStatus: "PENDING",
    });

    console.log(`[BLOCKCHAIN] Submitting createApplicant for ${applicantId}`);

    // Register on blockchain
    const transaction = await applicantManager.createApplicant(applicantId);

    console.log(`[BLOCKCHAIN] Transaction submitted: ${transaction.hash}`);

    const receipt = await transaction.wait();

    const blockchainStatus = receipt.status === 1 ? "CONFIRMED" : "FAILED";

    console.log(`[BLOCKCHAIN] Transaction confirmed: ${receipt.hash}, status: ${blockchainStatus}`);

    if (blockchainStatus === "FAILED") {
      await User.findByIdAndDelete(user._id);
      throw new Error("Blockchain transaction failed — user not created");
    }

    user.blockchainTxHash = transaction.hash;
    user.blockchainBlockNumber = receipt.blockNumber;
    user.blockchainStatus = blockchainStatus;
    await user.save();

    const token = generateToken(user);

    // Never return password
    const userObj = user.toObject();
    delete userObj.password;

    return {
      success: true,
      token,
      user: userObj,
      blockchain: {
        applicantId,
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber,
        status: blockchainStatus,
      },
    };

  } catch (error) {
    console.error("[REGISTRATION ERROR]:", error.message);

    // If user was created but blockchain failed, roll back
    if (user && user._id) {
      try {
        await User.findByIdAndDelete(user._id);
        console.log(`[ROLLBACK] Deleted user ${user._id} due to blockchain failure`);
      } catch (deleteErr) {
        console.error("[ROLLBACK ERROR]:", deleteErr.message);
      }
    }

    throw error;
  }
};

// ─── LOGIN — handles STUDENT, ORGANISATION, ADMIN ────────────────────────────

export const login = async (loginData) => {
  const { email, password, role } = loginData;

  if (!email || !password) {
    const err = new Error("email and password are required");
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase();
  const normalizedRole = (role || "STUDENT").toUpperCase();

  if (normalizedRole === "STUDENT" || normalizedRole === "ADMIN") {
    // Look up in User collection
    const user = await User.findOne({ email: normalizedEmail, role: normalizedRole });

    if (!user) {
      const err = new Error("Invalid email or password");
      err.statusCode = 401;
      throw err;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      const err = new Error("Invalid email or password");
      err.statusCode = 401;
      throw err;
    }

    const token = generateToken(user);

    const userObj = user.toObject();
    delete userObj.password;

    return {
      success: true,
      message: "Login successful",
      token,
      user: userObj,
    };
  }

  if (normalizedRole === "ORGANISATION") {
    const org = await OrganisationApplication.findOne({
      email: normalizedEmail,
      status: "Approved",
    });

    if (!org) {
      // Check if the org exists at all
      const anyOrg = await OrganisationApplication.findOne({ email: normalizedEmail });
      if (anyOrg) {
        const err = new Error(
          anyOrg.status === "Pending"
            ? "Your organisation application is still pending admin approval"
            : "Your organisation application was rejected"
        );
        err.statusCode = 403;
        throw err;
      }
      const err = new Error("Invalid email or password");
      err.statusCode = 401;
      throw err;
    }

    const passwordMatch = await bcrypt.compare(password, org.password);
    if (!passwordMatch) {
      const err = new Error("Invalid email or password");
      err.statusCode = 401;
      throw err;
    }

    const token = generateToken({
      _id: org._id,
      role: "ORGANISATION",
    });

    return {
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: org._id,
        name: org.organisationName,
        email: org.email,
        role: "ORGANISATION",
        organisationId: org.organisationId,
        organisationType: org.organisationType,
        status: org.status,
      },
    };
  }

  const err = new Error("Invalid role");
  err.statusCode = 400;
  throw err;
};