import { getContract } from "../config/contract";

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