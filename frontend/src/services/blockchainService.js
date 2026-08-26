import { ethers } from "ethers";
import { getContract } from "../config/contract";

import { getEmploymentContract }
  from "../utils/EmploymentContract";
import ApplicantManagerAbi from "../abhi/ApplicantManager.json";
import EmploymentManagerAbi from "../abhi/EmploymentManager.json";

const RPC_URL =
  import.meta.env.VITE_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

const getReadOnlyApplicantManagerContract = () => {
  const contractAddress = import.meta.env.VITE_APPLICANT_MANAGER_ADDRESS;

  if (!contractAddress) {
    throw new Error("ApplicantManager contract address is not configured.");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(
    contractAddress,
    ApplicantManagerAbi.abi,
    provider
  );
};

const getReadOnlyEmploymentContract = () => {
  const contractAddress = import.meta.env.VITE_EMPLOYMENT_MANAGER_ADDRESS;

  if (!contractAddress) {
    throw new Error("EmploymentManager contract address is not configured.");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(
    contractAddress,
    EmploymentManagerAbi.abi,
    provider
  );
};

export const getStudentProjectsFromBlockchain = async (walletAddress) => {
  if (!walletAddress) {
    return { projects: 0, verifiedProjects: 0, projectHashes: [] };
  }

  let normalizedAddress;
  try {
    normalizedAddress = ethers.getAddress(walletAddress);
  } catch (error) {
    console.error("Invalid wallet address for blockchain project fetch:", error);
    return { projects: 0, verifiedProjects: 0, projectHashes: [] };
  }

  try {
    const contract = getReadOnlyApplicantManagerContract();
    const applicantExists = await contract.applicantExists(normalizedAddress);

    if (!applicantExists) {
      return { projects: 0, verifiedProjects: 0, projectHashes: [] };
    }

    const projectHashes = await contract.getProjects(normalizedAddress);
    const projectList = Array.from(projectHashes || []);

    const verificationFlags = await Promise.all(
      projectList.map(async (projectHash) => {
        try {
          return await contract.isProjectVerified(projectHash);
        } catch (error) {
          console.error(
            "Blockchain project verification fetch failed for hash:",
            projectHash,
            error
          );
          return false;
        }
      })
    );

    return {
      projects: projectList.length,
      verifiedProjects: verificationFlags.filter(Boolean).length,
      projectHashes: projectList,
      projectVerificationStatus: verificationFlags
    };
  } catch (error) {
    console.error("Blockchain project fetch failed:", error);
    return { projects: 0, verifiedProjects: 0, projectHashes: [] };
  }
};

export const getApplicantProjectsDetailed = async (walletAddress) => {
  if (!walletAddress) {
    return [];
  }

  try {
    const normalizedAddress = ethers.getAddress(walletAddress);
    const contract = getReadOnlyApplicantManagerContract();
    const exists = await contract.applicantExists(normalizedAddress);

    if (!exists) {
      return [];
    }

    const hashes = await contract.getProjects(normalizedAddress);
    const details = await Promise.all(
      (hashes || []).map(async (hash) => {
        const verifications = await contract.getProjectVerifications(hash).catch(() => []);
        const isVerified = await contract.isProjectVerified(hash).catch(() => false);

        return {
          hash: hash.toString(),
          isVerified,
          verifications: (verifications || []).map((verification) => ({
            verifier: verification.verifier,
            verifiedAt: Number(verification.verifiedAt),
            revoked: Boolean(verification.revoked)
          }))
        };
      })
    );

    return details;
  } catch (error) {
    console.error("Project detail fetch failed:", error);
    return [];
  }
};

export const getStudentEmploymentOnChain = async (walletAddress) => {
  if (!walletAddress) {
    return { currentEmployment: [], previousEmployment: [] };
  }

  try {
    const normalizedAddress = ethers.getAddress(walletAddress);
    const applicantContract = await getContract();
    const employmentContract = await getEmploymentContract();

    const hashes = await applicantContract.getEmployments(normalizedAddress).catch(() => []);
    const nextOfferId = Number(await employmentContract.nextOfferId().catch(() => 0));
    const offerIds = Array.from({ length: nextOfferId }, (_, index) => index + 1);

    const offerMap = new Map();
    for (const offerId of offerIds) {
      const offer = await employmentContract.offers(offerId);
      if (offer.student.toLowerCase() !== normalizedAddress.toLowerCase()) continue;
      offerMap.set(offer.employmentHash.toString().toLowerCase(), {
        id: Number(offer.id),
        status: Number(offer.status),
        active: Boolean(offer.active),
        employmentType: Number(offer.employmentType) === 0 ? "Internship" : "Employment",
        organisation: offer.organisation,
        employmentHash: offer.employmentHash.toString()
      });
    }

    const records = await Promise.all(
      (hashes || []).map(async (hash) => {
        const employment = await applicantContract.employments(hash);
        const offerData = offerMap.get(hash.toString().toLowerCase());
        const isActive = await applicantContract.isEmploymentActive(hash).catch(() => Boolean(employment.endedAt === 0n));

        return {
          hash: hash.toString(),
          employmentHash: hash.toString(),
          organisation: employment.organisation,
          employmentType: Number(employment.employmentType) === 0 ? "Internship" : "Employment",
          joinedAt: Number(employment.joinedAt),
          endedAt: Number(employment.endedAt),
          active: Boolean(isActive),
          status: Boolean(isActive) ? "ACTIVE" : "TERMINATED",
          offerId: offerData?.id ?? null,
          offerStatus: offerData?.status ?? null,
          offerActive: offerData?.active ?? false
        };
      })
    );

    return {
      currentEmployment: records.filter((entry) => entry.active),
      previousEmployment: records.filter((entry) => !entry.active)
    };
  } catch (error) {
    console.error("Student employment fetch failed:", error);
    return { currentEmployment: [], previousEmployment: [] };
  }
};

export const createApplicant = async () => {
  const contract = await getContract();

  const tx = await contract.createApplicant();

  await tx.wait();

  return tx.hash;
};

export const applicantExists = async (walletAddress) => {
  const contract = await getContract();
  console.log(contract)
  return await contract.applicantExists(walletAddress);
};

export const addProjectOnChain = async (projectHash) => {
  const contract = await getContract();
  const signer = await contract.runner.getAddress();

  const exists = await contract.applicantExists(signer);
  if (!exists) {
    console.log("Applicant profile missing on-chain. Calling createApplicant()...");
    const createTx = await contract.createApplicant();
    await createTx.wait();
  }

  const tx = await contract.addProject(projectHash);
  await tx.wait();
  return tx.hash;
};

export const getCertificates = async (walletAddress) => {
  const contract = await getContract();

  return await contract.getCertificates(walletAddress);
};

export const getProjects = async (walletAddress) => {
  const contract = await getContract();

  return await contract.getProjects(walletAddress);
};

export const getEmployments = async (walletAddress) => {
  const contract = await getContract();

  return await contract.getEmployments(walletAddress);
};

export const createOffer = async (
  employmentHash,
  employmentType,
  studentAddress,
  deadline
) => {
  const contract =
    await getEmploymentContract();

  const tx = await contract.createOffer(
    employmentHash,
    employmentType,
    studentAddress,
    deadline
  );

 const receipt = await tx.wait();

let offerId;

for (const log of receipt.logs) {
  try {
    const parsed = contract.interface.parseLog(log);

    if (parsed.name === "OfferCreated") {
      offerId = parsed.args[0].toString();
      break;
    }
  } catch {}
}

return {
  offerId,
  txHash: tx.hash,
};
};

export const acceptOffer = async (offerId) => {
  const contract = await getEmploymentContract();

  const tx = await contract.acceptOffer(offerId);

  await tx.wait();

  return tx.hash;
};

export const rejectOffer = async (offerId) => {
  const contract = await getEmploymentContract();

  const tx = await contract.rejectOffer(offerId);

  await tx.wait();

  return tx.hash;
};
export const getStudentOffers =
  async () => {
    const contract =
      await getEmploymentContract();

    return await contract.getStudentOffers();
};

export const getOrganisationOffers =
  async () => {
    const contract =
      await getEmploymentContract();

    return await contract.getOrganisationOffers();
};

export const terminateEmployment = async (offerId) => {
  const contract = await getEmploymentContract();
  const tx = await contract.endEmployment(offerId);
  await tx.wait();
  return tx.hash;
};

export const getStudentCertificatesOnChain = async (walletAddress) => {
  if (!walletAddress) return [];

  try {
    const normalizedAddress = ethers.getAddress(walletAddress);
    const contract = getReadOnlyApplicantManagerContract();
    const hashes = await contract.getCertificates(normalizedAddress);

    return Promise.all((hashes || []).map(async (hash) => {
      const certificate = await contract.certificates(hash);
      return {
        certificateHash: hash.toString(),
        credentialType: Number(certificate.credentialType),
        issuer: certificate.issuer,
        issuedAt: Number(certificate.issuedAt),
        expiresAt: Number(certificate.expiresAt),
        revoked: Boolean(certificate.revoked),
        onChainVerified: true
      };
    }));
  } catch (error) {
    console.error("Student certificate fetch failed:", error);
    return [];
  }
};