// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./libraries/Types.sol";
import "./ApplicantManager.sol";
import "./OrganisationRegistry.sol";

contract CertificateManager {

    // errors
    error InvalidOrganisation();
    error InvalidStudent();
    error InvalidExpiry();

    // events
    event CertificateIssued(
        address indexed student,
        bytes32 indexed certificateHash,
        address indexed issuer
    );

    // contracts
    ApplicantManager public immutable applicantManager;
    OrganisationRegistry public immutable organisationRegistry;

    // constructor
    constructor(
        address applicantManagerAddress,
        address organisationRegistryAddress
    ) {
        applicantManager = ApplicantManager(applicantManagerAddress);
        organisationRegistry = OrganisationRegistry(
            organisationRegistryAddress
        );
    }

    // Institution directly issues a certificate to a student
    function issueCertificate(
        address student,
        bytes32 certificateHash,
        Types.CredentialType credentialType,
        uint64 expiresAt
    ) external {

        // Only active organisations can issue certificates
        if (
            !organisationRegistry.isActiveOrganisation(msg.sender)
        ) {
            revert InvalidOrganisation();
        }

        // Student wallet must be valid
        if (student == address(0)) {
            revert InvalidStudent();
        }

        // Certificate expiry must be in the future
        if (
            expiresAt != 0 &&
            expiresAt <= block.timestamp
        ) {
            revert InvalidExpiry();
        }

        // ApplicantManager performs the remaining certificate validation
        applicantManager.addCertificate(
            student,
            certificateHash,
            credentialType,
            msg.sender,
            expiresAt
        );

        emit CertificateIssued(
            student,
            certificateHash,
            msg.sender
        );
    }
}