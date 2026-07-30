import { ethers } from "ethers";
import ApplicantManager from "../abhi/ApplicantManager.json"

export const CONTRACT_ADDRESS =
  "0x71a1B734439dcC1c6aF3c8B01a030F524FcfFf72";

export const getContract = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
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