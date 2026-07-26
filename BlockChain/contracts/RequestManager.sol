// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./libraries/Types.sol";
import "./ApplicantManager.sol";

contract RequestManager {

    //errors
    error RequestAlreadyExists(uint256 requestId);
    error RequestNotFound();
    error RequestAlreadyProcessed();
    error UnauthorizedVerifier();
    error InvalidExpiry();
    error InvalidRequestType();

    //events
    event RequestCreated(uint256 indexed id, address indexed student);
    event RequestApproved(uint256 indexed id);
    event RequestRejected(uint256 indexed id);

    //constructor
    constructor(address applicantManagerAddress) {
        applicantManager = ApplicantManager(applicantManagerAddress);
    }

    //struct
    struct Request {
        uint256 id;
        bytes32 credentialHash;
        Types.CredentialType credentialType;
        Types.RequestType requestType;
        address student;
        address expectedVerifier;
        Types.RequestStatus status;
        uint64 createdAt;
        uint64 expiresAt;
    }

    //statevars
    mapping(uint256 => Request) public requests;

    // credentialHash -> expectedVerifier -> requestType -> requestId
    mapping(bytes32 => mapping(address => mapping(Types.RequestType => uint256)))
        public activeRequests;

    uint256 public nextRequestId;

    ApplicantManager public immutable applicantManager;

    //functions
    function createRequest(
        bytes32 _credentialHash,
        Types.CredentialType _credentialType,
        Types.RequestType _requestType,
        address _expectedVerifier,
        uint64 _expiresAt
    ) external {

        if (activeRequests[_credentialHash][_expectedVerifier][_requestType] != 0) {
            revert RequestAlreadyExists(
                activeRequests[_credentialHash][_expectedVerifier][_requestType]
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

        uint256 _id = ++nextRequestId;

        requests[_id] = Request({
            id: _id,
            student: msg.sender,
            expectedVerifier: _expectedVerifier,
            credentialHash: _credentialHash,
            credentialType: _credentialType,
            requestType: _requestType,
            status: Types.RequestStatus.Pending,
            createdAt: uint64(block.timestamp),
            expiresAt: _expiresAt
        });

        activeRequests[_credentialHash][_expectedVerifier][_requestType] = _id;

        emit RequestCreated(_id, msg.sender);
    }

    //makes sure the requestType actually matches the credentialType being acted on
    function _validateRequestType(
        Types.CredentialType credentialType,
        Types.RequestType requestType
    ) internal pure {

        if (credentialType == Types.CredentialType.Project) {

            if (
                requestType != Types.RequestType.AddProjectVerification &&
                requestType != Types.RequestType.RevokeProjectVerification
            ) {
                revert InvalidRequestType();
            }

        } else {

            if (
                requestType != Types.RequestType.AddCertificate &&
                requestType != Types.RequestType.RevokeCertificate
            ) {
                revert InvalidRequestType();
            }
        }
    }

    //validation (read-only, no side effects)
    function _validateRequest(
        uint256 requestId
    ) internal view returns (Request storage request) {

        request = requests[requestId];

        if (request.id == 0)
            revert RequestNotFound();

        if (request.status != Types.RequestStatus.Pending)
            revert RequestAlreadyProcessed();

        if (request.expectedVerifier != msg.sender)
            revert UnauthorizedVerifier();

        return request;
    }

    //closes out a request: sets final status and clears the active-request slot
    function _closeRequest(
        Request storage request,
        Types.RequestStatus status
    ) internal {

        request.status = status;

        delete activeRequests[
            request.credentialHash
        ][
            request.expectedVerifier
        ][
            request.requestType
        ];
    }

    function approveRequest(uint256 requestId) external {

        Request storage request = _validateRequest(requestId);

        if (request.requestType == Types.RequestType.AddCertificate) {

            _approveCertificate(request);

        } else if (request.requestType == Types.RequestType.RevokeCertificate) {

            _revokeCertificate(request);

        } else if (request.requestType == Types.RequestType.AddProjectVerification) {

            _approveProjectVerification(request);

        } else if (request.requestType == Types.RequestType.RevokeProjectVerification) {

            _revokeProjectVerification(request);

        } else {

            revert InvalidRequestType();
        }

        _closeRequest(request, Types.RequestStatus.Approved);

        emit RequestApproved(requestId);
    }

    function rejectRequest(uint256 requestId) external {
        Request storage request = _validateRequest(requestId);

        _closeRequest(request, Types.RequestStatus.Rejected);

        emit RequestRejected(requestId);
    }

    // ApplicantManager dispatch

    function _approveCertificate(
        Request storage request
    ) internal {

        applicantManager.addCertificate(
            request.student,
            request.credentialHash,
            request.credentialType,
            msg.sender,
            request.expiresAt
        );
    }

    function _revokeCertificate(
        Request storage request
    ) internal {

        applicantManager.revokeCertificate(
            request.credentialHash
        );
    }

    function _approveProjectVerification(
        Request storage request
    ) internal {

        applicantManager.addProjectVerification(
            request.credentialHash,
            msg.sender
        );
    }

    function _revokeProjectVerification(
        Request storage request
    ) internal {

        applicantManager.revokeProjectVerification(
            request.credentialHash,
            msg.sender
        );
    }
}