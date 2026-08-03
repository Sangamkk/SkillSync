import { ethers } from "ethers";
import RequestManager from "../abhi/RequestManager.json";

export const REQUEST_MANAGER_ADDRESS = "0x5A408bB5b74a7D2853D5b5f43591C401c8d89e12";

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