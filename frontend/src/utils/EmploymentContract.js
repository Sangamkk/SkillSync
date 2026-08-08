import { ethers } from "ethers";

import EmploymentManager from "../abhi/EmploymentManager.json";

export const CONTRACT_ADDRESS = import.meta.env.VITE_EMPLOYMENT_MANAGER_ADDRESS;

export const getEmploymentContract = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  const provider = new ethers.BrowserProvider( window.ethereum );
  const signer = await provider.getSigner();
  console.log(
    "Current Signer:",
    await signer.getAddress()
  );

  return new ethers.Contract(
    CONTRACT_ADDRESS,
    EmploymentManager.abi,
    signer
  );
};