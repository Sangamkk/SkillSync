// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library Types {
    enum CredentialType {
        Certificate,
        Project,
        Internship,
        Hackathon,
        ResearchPaper,
        Patent
    }

    enum RequestStatus {
        Pending,
        Approved,
        Rejected,
        Cancelled
    }

    struct Verification {
        bytes32 verifierId;
        uint64 verifiedAt;
        bool revoked;
    }

    enum RequestType {
        AddCertificate,
        RevokeCertificate,
        AddProjectVerification,
        RevokeProjectVerification,
        AddEmployment,
        TerminateEmployment
    }

    enum OrganizationType {
        Company,
        University,
        ResearchLab,
        NGO,
        Government,
        Other
    }

    enum EmploymentType {
        Internship,
        Employment
    }

    enum ApprovalType {
        Organisation,
        Student
    }
}