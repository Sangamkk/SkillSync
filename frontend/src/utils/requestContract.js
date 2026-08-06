import { ethers } from "ethers";
import RequestManager from "../abhi/RequestManager.json";

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_REQUEST_MANAGER_ADDRESS;

export const getRequestContract = async () => {
    console.log("Address:", CONTRACT_ADDRESS);
    console.log("ABI:", RequestManager.abi);
    if (!window.ethereum) {
        throw new Error("MetaMask not found");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    const signer = await provider.getSigner();

    return new ethers.Contract(
        CONTRACT_ADDRESS,
        RequestManager.abi,
        signer
    );

};