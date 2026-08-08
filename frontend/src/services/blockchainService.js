import { getContract } from "../config/contract";

import { getEmploymentContract }
  from "../utils/EmploymentContract";

export const createApplicant = async () => {
  const contract = await getContract();

  const tx = await contract.createApplicant();

  await tx.wait();

  return tx.hash;
};

export const applicantExists = async (walletAddress) => {
  const contract = await getContract();

  return await contract.applicantExists(walletAddress);
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

export const terminateEmployment =
  async (offerId) => {
    const contract = await getEmploymentContract();
      return await contract.endEmployment(offerId);
  }