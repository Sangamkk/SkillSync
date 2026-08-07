import { ethers } from "ethers";

import OrganisationRegistry from "../abhi/OrganisationRegistry.json";

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_ORGANISATION_REGISTRY_ADDRESS;
export const CONTRACT_ADDRESS = "0xBD6CA9F5d296A4E340D9b5B2Eb2B07aCb62c8A5C";

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