// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./libraries/Types.sol";
import "./ApplicantManager.sol";
import "./OrganisationRegistry.sol";

contract CertificateManager {
    error InvalidOrganisation();
    error InvalidApplicant();
    error InvalidExpiry();
    error NotOwner();
    error InvalidOrganisationId();
    error InvalidApplicantId();
    error DuplicateCertificate();

    event CertificateIssued(
        bytes32 indexed applicantId,
        bytes32 indexed organisationId,
        bytes32 indexed certificateHash
    );

    ApplicantManager public immutable applicantManager;
    OrganisationRegistry public immutable organisationRegistry;
    address public immutable owner;

    constructor(address applicantManagerAddress, address organisationRegistryAddress) {
        applicantManager = ApplicantManager(applicantManagerAddress);
        organisationRegistry = OrganisationRegistry(organisationRegistryAddress);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function issueCertificate(
        bytes32 applicantId,
        bytes32 organisationId,
        bytes32 certificateHash,
        Types.CredentialType credentialType,
        uint64 expiresAt
    ) external onlyOwner {
        if (applicantId == 0) revert InvalidApplicantId();
        if (organisationId == 0) revert InvalidOrganisationId();
        if (!applicantManager.applicantExists(applicantId)) revert InvalidApplicant();
        if (!organisationRegistry.isActiveOrganisation(organisationId)) revert InvalidOrganisation();
        if (certificateHash == 0) revert DuplicateCertificate();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpiry();

        applicantManager.addCertificate(
            applicantId,
            organisationId,
            certificateHash,
            credentialType,
            expiresAt
        );

        emit CertificateIssued(applicantId, organisationId, certificateHash);
    }

    function revokeCertificate(bytes32 certificateHash) external onlyOwner {
        applicantManager.revokeCertificate(certificateHash);
    }
}