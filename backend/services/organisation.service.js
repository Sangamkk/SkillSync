import OrganisationApplication from "../models/OrganisationApplication.js";

export const createApplicationService = async (data) => {

    const application = await OrganisationApplication.create(data);

    return application;

};

export const getPendingApplicationsService = async () => {

    return await OrganisationApplication.find({
        status: "Pending"
    });

};

export const approveApplicationService =
async (id, txHash) => {

    return await OrganisationApplication.findByIdAndUpdate(

        id,

        {

            status: "Approved",

            txHash

        },

        {

            new: true

        }

    );

};