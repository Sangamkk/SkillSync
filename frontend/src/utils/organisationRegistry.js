import { ethers } from "ethers";

import OrganisationRegistry from "../abhi/OrganisationRegistry.json";

export const CONTRACT_ADDRESS = "0x4ab87ef69789F1B3979562e05Fd02ff08952B9eB";

export const getOrganisationRegistry = async () => {
    await window.ethereum.request({
        method: "eth_requestAccounts"
    });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    console.log(
        "Current Signer:",
        await signer.getAddress()
    );
    return new ethers.Contract(
        CONTRACT_ADDRESS,
        OrganisationRegistry.abi,
        signer
    );

};