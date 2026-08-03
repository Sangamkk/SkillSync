import { getOrganisationRegistry } from "../utils/organisationRegistry";

export const organisationLogin = async () => {

    const contract = await getOrganisationRegistry();

    const signer = await contract.runner.getAddress();

    const organisation = await contract.organisations(signer);

    if (!organisation.exists) {
        throw new Error("Organisation not registered");
    }

    if (!organisation.isActive) {
        throw new Error("Organisation is inactive");
    }

    return {
        wallet: signer,
        organisation
    };
};