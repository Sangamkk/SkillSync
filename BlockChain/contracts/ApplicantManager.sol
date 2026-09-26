// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./libraries/Types.sol";

contract ApplicantManager {
    error ApplicantAlreadyExists();
    error ApplicantNotFound();
    error CertificateAlreadyExists();
    error CertificateNotFound();
    error CertificateAlreadyRevoked();
    error ProjectAlreadyExists();
    error ProjectNotFound();
    error AlreadyVerifiedByIssuer();
    error InvalidCredentialType();
    error InvalidExpiry();
    error ProjectVerificationAlreadyRevoked();
    error VerificationNotFound();
    error UnauthorisedOperation();
    error RequestManagerAlreadySet();
    error CertificateManagerAlreadySet();
    error NotOwner();
    error EmploymentAlreadyExists();
    error EmploymentNotFound();
    error EmploymentAlreadyTerminated();
    error EmploymentManagerAlreadySet();
    error InvalidApplicantId();
    error InvalidOrganisationId();
    error InvalidCertificateHash();

    event ApplicantCreated(bytes32 indexed applicantId);
    event CertificateAdded(
        bytes32 indexed applicantId,
        bytes32 indexed organisationId,
        bytes32 indexed certificateHash
    );
    event CertificateRevoked(bytes32 indexed certificateHash);
    event Projectadded(bytes32 indexed applicantId, bytes32 indexed projectHash);
    event Projectverified(bytes32 indexed organisationId, bytes32 indexed projectHash);
    event ProjectVerificationRevoked(bytes32 indexed organisationId, bytes32 indexed projectHash);
    event EmploymentAdded(
        bytes32 indexed applicantId,
        bytes32 indexed organisationId,
        bytes32 indexed employmentHash
    );
    event EmploymentTerminated(bytes32 indexed employmentHash, bytes32 indexed organisationId);

    address public employmentManager;
    address public requestManager;
    address public certificateManager;
    address public immutable owner;

    struct Certificate {
        bytes32 certificateHash;
        bytes32 applicantId;
        bytes32 organisationId;
        Types.CredentialType credentialType;
        uint64 issuedAt;
        uint64 expiresAt;
        bool revoked;
    }

    struct Project {
        bool exists;
        bytes32 projectHash;
        bytes32 applicantId;
        Types.Verification[] verifications;
    }

    struct Employment {
        bool exists;
        bytes32 employmentHash;
        bytes32 organisationId;
        bytes32 applicantId;
        Types.EmploymentType employmentType;
        uint64 joinedAt;
        uint64 endedAt;
    }

    struct Applicant {
        bool exists;
        bytes32[] certificates;
        bytes32[] projects;
        bytes32[] employments;
    }

    mapping(bytes32 => Applicant) public applicants;
    mapping(bytes32 => Certificate) public certificates;
    mapping(bytes32 => Project) public projects;
    mapping(bytes32 => Employment) public employments;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAuthorizedCaller() {
        if (
            msg.sender != owner &&
            msg.sender != requestManager &&
            msg.sender != certificateManager &&
            msg.sender != employmentManager
        ) {
            revert NotOwner();
        }
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setRequestManager(address _requestManager) external onlyOwner {
        if (requestManager != address(0)) {
            revert RequestManagerAlreadySet();
        }
        requestManager = _requestManager;
    }

    function setCertificateManager(address _certificateManager) external onlyOwner {
        if (certificateManager != address(0)) {
            revert CertificateManagerAlreadySet();
        }
        certificateManager = _certificateManager;
    }

    function setEmploymentManager(address _employmentManager) external onlyOwner {
        if (employmentManager != address(0)) revert EmploymentManagerAlreadySet();
        employmentManager = _employmentManager;
    }

    function createApplicant(bytes32 applicantId) external onlyAuthorizedCaller {
        if (applicantId == 0) revert InvalidApplicantId();
        if (applicants[applicantId].exists) revert ApplicantAlreadyExists();

        applicants[applicantId].exists = true;
        emit ApplicantCreated(applicantId);
    }

    function applicantExists(bytes32 applicantId) external view returns (bool) {
        return applicants[applicantId].exists;
    }

    function addCertificate(
        bytes32 applicantId,
        bytes32 organisationId,
        bytes32 certificateHash,
        Types.CredentialType credentialType,
        uint64 expiresAt
    ) external onlyAuthorizedCaller {
        if (applicantId == 0) revert InvalidApplicantId();
        if (organisationId == 0) revert InvalidOrganisationId();
        if (certificateHash == 0) revert InvalidCertificateHash();
        if (!applicants[applicantId].exists) revert ApplicantNotFound();
        if (credentialType == Types.CredentialType.Project) revert InvalidCredentialType();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpiry();

        Certificate storage cert = certificates[certificateHash];
        if (cert.certificateHash != 0) revert CertificateAlreadyExists();

        certificates[certificateHash] = Certificate({
            certificateHash: certificateHash,
            applicantId: applicantId,
            organisationId: organisationId,
            credentialType: credentialType,
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            revoked: false
        });

        applicants[applicantId].certificates.push(certificateHash);
        emit CertificateAdded(applicantId, organisationId, certificateHash);
    }

    function revokeCertificate(bytes32 certificateHash) external onlyAuthorizedCaller {
        Certificate storage cert = certificates[certificateHash];

        if (cert.certificateHash == 0) revert CertificateNotFound();
        if (cert.revoked) revert CertificateAlreadyRevoked();

        cert.revoked = true;
        emit CertificateRevoked(certificateHash);
    }

    function addProject(bytes32 applicantId, bytes32 projectHash) external onlyAuthorizedCaller {
        if (applicantId == 0) revert InvalidApplicantId();
        if (projectHash == 0) revert InvalidCertificateHash();
        if (!applicants[applicantId].exists) revert ApplicantNotFound();
        if (projects[projectHash].exists) revert ProjectAlreadyExists();

        Project storage project = projects[projectHash];
        project.exists = true;
        project.projectHash = projectHash;
        project.applicantId = applicantId;

        applicants[applicantId].projects.push(projectHash);
        emit Projectadded(applicantId, projectHash);
    }

    function addProjectVerification(
        bytes32 projectHash,
        bytes32 organisationId
    ) external onlyAuthorizedCaller {
        if (projectHash == 0) revert InvalidCertificateHash();
        if (organisationId == 0) revert InvalidOrganisationId();
        if (!projects[projectHash].exists) revert ProjectNotFound();

        Project storage project = projects[projectHash];

        for (uint256 i = 0; i < project.verifications.length; i++) {
            if (
                project.verifications[i].verifierId == organisationId &&
                !project.verifications[i].revoked
            ) {
                revert AlreadyVerifiedByIssuer();
            }
        }

        project.verifications.push(
            Types.Verification({
                verifierId: organisationId,
                verifiedAt: uint64(block.timestamp),
                revoked: false
            })
        );

        emit Projectverified(organisationId, projectHash);
    }

    function revokeProjectVerification(
        bytes32 projectHash,
        bytes32 organisationId
    ) external onlyAuthorizedCaller {
        if (projectHash == 0) revert InvalidCertificateHash();
        if (organisationId == 0) revert InvalidOrganisationId();
        if (!projects[projectHash].exists) revert ProjectNotFound();

        Project storage project = projects[projectHash];
        bool found = false;

        for (uint256 i = 0; i < project.verifications.length; i++) {
            if (project.verifications[i].verifierId == organisationId) {
                found = true;

                if (project.verifications[i].revoked) {
                    revert ProjectVerificationAlreadyRevoked();
                }

                project.verifications[i].revoked = true;
                emit ProjectVerificationRevoked(organisationId, projectHash);
                return;
            }
        }

        if (!found) revert VerificationNotFound();
    }

    function addEmployment(
        bytes32 applicantId,
        bytes32 employmentHash,
        Types.EmploymentType employmentType,
        bytes32 organisationId
    ) external onlyAuthorizedCaller {
        if (applicantId == 0) revert InvalidApplicantId();
        if (organisationId == 0) revert InvalidOrganisationId();
        if (employmentHash == 0) revert InvalidCertificateHash();
        if (!applicants[applicantId].exists) revert ApplicantNotFound();
        if (employments[employmentHash].exists) revert EmploymentAlreadyExists();

        Employment storage employment = employments[employmentHash];
        employment.exists = true;
        employment.employmentHash = employmentHash;
        employment.organisationId = organisationId;
        employment.applicantId = applicantId;
        employment.employmentType = employmentType;
        employment.joinedAt = uint64(block.timestamp);

        applicants[applicantId].employments.push(employmentHash);
        emit EmploymentAdded(applicantId, organisationId, employmentHash);
    }

    function endEmployment(bytes32 employmentHash) external onlyAuthorizedCaller {
        Employment storage employment = employments[employmentHash];

        if (!employment.exists) revert EmploymentNotFound();
        if (employment.endedAt != 0) revert EmploymentAlreadyTerminated();

        employment.endedAt = uint64(block.timestamp);
        emit EmploymentTerminated(employmentHash, employment.organisationId);
    }

    function isProjectVerified(bytes32 projectHash) public view returns (bool) {
        if (!projects[projectHash].exists) revert ProjectNotFound();

        Project storage project = projects[projectHash];
        for (uint256 i = 0; i < project.verifications.length; i++) {
            if (!project.verifications[i].revoked) {
                return true;
            }
        }
        return false;
    }

    function getProjectVerifications(bytes32 projectHash)
        external
        view
        returns (Types.Verification[] memory)
    {
        if (!projects[projectHash].exists) revert ProjectNotFound();
        return projects[projectHash].verifications;
    }

    function getCertificates(bytes32 applicantId) external view returns (bytes32[] memory) {
        if (!applicants[applicantId].exists) revert ApplicantNotFound();
        return applicants[applicantId].certificates;
    }

    function getProjects(bytes32 applicantId) external view returns (bytes32[] memory) {
        if (!applicants[applicantId].exists) revert ApplicantNotFound();
        return applicants[applicantId].projects;
    }

    function getEmployments(bytes32 applicantId) external view returns (bytes32[] memory) {
        if (!applicants[applicantId].exists) revert ApplicantNotFound();
        return applicants[applicantId].employments;
    }

    function isEmploymentActive(bytes32 employmentHash) external view returns (bool) {
        Employment storage employment = employments[employmentHash];
        if (!employment.exists) revert EmploymentNotFound();
        return employment.endedAt == 0;
    }
}