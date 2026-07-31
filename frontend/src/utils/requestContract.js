import { ethers } from "ethers";
import RequestManager from "../abhi/RequestManager.json";

export const REQUEST_MANAGER_ADDRESS = "0xfcC67b0AE4e42D0680C0096e301197de8B735d1e";

export const getRequestContract = async () => {
    console.log("Address:", REQUEST_MANAGER_ADDRESS);
    console.log("ABI:", RequestManager.abi);
    if (!window.ethereum) {
        throw new Error("MetaMask not found");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    const signer = await provider.getSigner();

    return new ethers.Contract(
        REQUEST_MANAGER_ADDRESS,
        RequestManager.abi,
        signer
    );

};