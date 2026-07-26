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
        address verifier;
        uint64 verifiedAt;
        bool revoked;
    }

        enum RequestType {
        AddCertificate,
        RevokeCertificate,
        AddProjectVerification,
        RevokeProjectVerification
    }

}