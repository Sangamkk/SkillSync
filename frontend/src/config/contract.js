import { ethers } from "ethers";
import ApplicantManager from "../abhi/ApplicantManager.json"

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_APPLICANT_MANAGER_ADDRESS;

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
  console.log(
    "Organisation Registry Address:",
    import.meta.env.VITE_ORGANISATION_REGISTRY_ADDRESS
);

console.log(
    "Connected Wallet:",
    await signer.getAddress()
);

console.log(
    "Contract Address:",
    contract.target
);
  return contract;
};