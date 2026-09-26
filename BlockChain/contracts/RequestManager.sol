// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./libraries/Types.sol";
import "./ApplicantManager.sol";
import "./OrganisationRegistry.sol";

contract RequestManager {
    error RequestAlreadyExists(uint256 requestId);
    error RequestNotFound();
    error RequestAlreadyProcessed();
    error UnauthorizedVerifier();
    error InvalidExpiry();
    error InvalidRequestType();
    error InvalidIssuer();
    error InvalidApplicantId();
    error InvalidOrganisationId();
    error NotOwner();

    event RequestCreated(uint256 indexed id, bytes32 indexed applicantId);
    event RequestApproved(uint256 indexed id);
    event RequestRejected(uint256 indexed id);

    address public immutable owner;

    constructor(address applicantManagerAddress, address orgRegistryaddress) {
        applicantManager = ApplicantManager(applicantManagerAddress);
        organisationRegistry = OrganisationRegistry(orgRegistryaddress);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    struct Request {
        uint256 id;
        bytes32 credentialHash;
        Types.CredentialType credentialType;
        Types.RequestType requestType;
        bytes32 applicantId;
        bytes32 expectedVerifierId;
        Types.RequestStatus status;
        uint64 createdAt;
        uint64 expiresAt;
    }

    mapping(uint256 => Request) public requests;
    mapping(bytes32 => uint256[]) private outgoingRequests;
    mapping(bytes32 => uint256[]) private incomingRequests;
    mapping(bytes32 => mapping(bytes32 => mapping(Types.RequestType => uint256)))
        public activeRequests;
    uint256 public nextRequestId;

    ApplicantManager public immutable applicantManager;
    OrganisationRegistry public immutable organisationRegistry;

    function createRequest(
        bytes32 _credentialHash,
        Types.CredentialType _credentialType,
        Types.RequestType _requestType,
        bytes32 _applicantId,
        bytes32 _expectedVerifierId,
        uint64 _expiresAt
    ) external onlyOwner {
        if (_applicantId == 0) revert InvalidApplicantId();
        if (_expectedVerifierId == 0) revert InvalidOrganisationId();

        if (activeRequests[_credentialHash][_expectedVerifierId][_requestType] != 0) {
            revert RequestAlreadyExists(
                activeRequests[_credentialHash][_expectedVerifierId][_requestType]
            );
        }

        _validateRequestType(_credentialType, _requestType);

        if (
            _requestType == Types.RequestType.AddCertificate &&
            _expiresAt != 0 &&
            _expiresAt <= block.timestamp
        ) {
            revert InvalidExpiry();
        }

        if (!organisationRegistry.isActiveOrganisation(_expectedVerifierId)) {
            revert InvalidIssuer();
        }

        if (!applicantManager.applicantExists(_applicantId)) {
            revert InvalidApplicantId();
        }

        uint256 _id = ++nextRequestId;

        requests[_id] = Request({
            id: _id,
            applicantId: _applicantId,
            expectedVerifierId: _expectedVerifierId,
            credentialHash: _credentialHash,
            credentialType: _credentialType,
            requestType: _requestType,
            status: Types.RequestStatus.Pending,
            createdAt: uint64(block.timestamp),
            expiresAt: _expiresAt
        });

        outgoingRequests[_applicantId].push(_id);
        incomingRequests[_expectedVerifierId].push(_id);
        activeRequests[_credentialHash][_expectedVerifierId][_requestType] = _id;

        emit RequestCreated(_id, _applicantId);
    }

    function _validateRequestType(
        Types.CredentialType credentialType,
        Types.RequestType requestType
    ) internal pure {
        if (credentialType == Types.CredentialType.Project) {
            if (requestType != Types.RequestType.AddProjectVerification) {
                revert InvalidRequestType();
            }
        } else {
            if (requestType != Types.RequestType.AddCertificate) {
                revert InvalidRequestType();
            }
        }
    }

    function _validateRequest(uint256 requestId, bytes32 expectedVerifierId)
        internal
        view
        returns (Request storage request)
    {
        request = requests[requestId];

        if (request.id == 0) revert RequestNotFound();
        if (request.status != Types.RequestStatus.Pending) revert RequestAlreadyProcessed();
        if (request.expectedVerifierId != expectedVerifierId) revert UnauthorizedVerifier();

        return request;
    }

    function _closeRequest(
        Request storage request,
        Types.RequestStatus status
    ) internal {
        request.status = status;
        delete activeRequests[request.credentialHash][request.expectedVerifierId][request.requestType];
    }

    function approveRequest(uint256 requestId, bytes32 verifierId) external onlyOwner {
        Request storage request = _validateRequest(requestId, verifierId);

        if (request.requestType == Types.RequestType.AddCertificate) {
            applicantManager.addCertificate(
                request.applicantId,
                request.expectedVerifierId,
                request.credentialHash,
                request.credentialType,
                request.expiresAt
            );
        } else if (request.requestType == Types.RequestType.AddProjectVerification) {
            applicantManager.addProjectVerification(
                request.credentialHash,
                request.expectedVerifierId
            );
        } else {
            revert InvalidRequestType();
        }

        _closeRequest(request, Types.RequestStatus.Approved);
        emit RequestApproved(requestId);
    }

    function rejectRequest(uint256 requestId, bytes32 verifierId) external onlyOwner {
        Request storage request = _validateRequest(requestId, verifierId);
        _closeRequest(request, Types.RequestStatus.Rejected);
        emit RequestRejected(requestId);
    }

    function getIssuerRequests(bytes32 organisationId) external view returns (uint256[] memory) {
        return incomingRequests[organisationId];
    }

    function getStudentRequests(bytes32 applicantId) external view returns (uint256[] memory) {
        return outgoingRequests[applicantId];
    }
}