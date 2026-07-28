const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SkillSync", (m) => {

    const registry = m.contract("OrganisationRegistry");

    const applicantManager=m.contract("ApplicantManager");



    const RequestManager=m.contract("RequestManager",[applicantManager,registry]);

    const EmploymentManager=m.contract("EmploymentManager",[applicantManager,registry]);


    m.call(applicantManager, "setRequestManager", [
    RequestManager
]);

m.call(applicantManager, "setEmploymentManager", [
    EmploymentManager
]);



    return {
        registry,applicantManager,RequestManager,EmploymentManager
    };
});