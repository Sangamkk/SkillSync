export const CredentialType = {
    Certificate: 0,
    Project: 1,
    Internship: 2,
    Hackathon: 3,
    ResearchPaper: 4,
    Patent: 5
};

export const RequestType = {
    AddCertificate: 0,
    RevokeCertificate: 1,
    AddProjectVerification: 2,
    RevokeProjectVerification: 3,
    AddEmployment: 4,
    TerminateEmployment: 5
};

export const EmploymentType = {
    Internship: 0,
    Employment: 1
};

export const OrganizationType = {
    Company: 0,
    University: 1,
    ResearchLab: 2,
    NGO: 3,
    Government: 4,
    Other: 5
};