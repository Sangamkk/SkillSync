import { ethers } from "ethers";
import ApplicantManager from "../abi/ApplicantManager.json";

const CONTRACT_ADDRESS = "";

export const getContract = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  const signer = await provider.getSigner();

  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    ApplicantManager.abi,
    signer
  );

  return contract;
};