// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./libraries/Types.sol";
import "./ApplicantManager.sol";
import "./OrganisationRegistry.sol";

contract EmploymentManager {
    error OfferAlreadyExists(uint256 offerId);
    error OfferNotFound();
    error OfferAlreadyProcessed();
    error UnauthorizedStudent();
    error UnauthorizedOrganisation();
    error InvalidOrganisation();
    error EmploymentNotActive();
    error InvalidExpiry();
    error OfferExpired();
    error InvalidApplicantId();
    error NotOwner();

    event OfferCreated(uint256 indexed id, bytes32 indexed organisationId, bytes32 indexed applicantId);
    event OfferAccepted(uint256 indexed id);
    event OfferRejected(uint256 indexed id);
    event EmploymentEnded(uint256 indexed id);

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

    struct EmploymentOffer {
        uint256 id;
        bytes32 employmentHash;
        Types.EmploymentType employmentType;
        bytes32 organisationId;
        bytes32 applicantId;
        Types.RequestStatus status;
        bool active;
        uint64 offerDeadline;
    }

    mapping(uint256 => EmploymentOffer) public offers;
    mapping(bytes32 => uint256[]) private organisationOffers;
    mapping(bytes32 => uint256[]) private studentOffers;
    mapping(bytes32 => mapping(bytes32 => mapping(bytes32 => uint256))) public activeOffers;
    uint256 public nextOfferId;

    function createOffer(
        bytes32 _employmentHash,
        Types.EmploymentType _employmentType,
        bytes32 _organisationId,
        bytes32 _applicantId,
        uint64 _offerDeadline
    ) external onlyOwner {
        if (_organisationId == 0) revert InvalidOrganisation();
        if (_applicantId == 0) revert InvalidApplicantId();
        if (activeOffers[_employmentHash][_organisationId][_applicantId] != 0) {
            revert OfferAlreadyExists(activeOffers[_employmentHash][_organisationId][_applicantId]);
        }
        if (!organisationRegistry.isActiveOrganisation(_organisationId)) {
            revert InvalidOrganisation();
        }
        if (!applicantManager.applicantExists(_applicantId)) {
            revert InvalidApplicantId();
        }
        if (_offerDeadline != 0 && _offerDeadline <= block.timestamp) {
            revert InvalidExpiry();
        }

        uint256 _id = ++nextOfferId;

        offers[_id] = EmploymentOffer({
            id: _id,
            employmentHash: _employmentHash,
            employmentType: _employmentType,
            organisationId: _organisationId,
            applicantId: _applicantId,
            status: Types.RequestStatus.Pending,
            active: false,
            offerDeadline: _offerDeadline
        });

        organisationOffers[_organisationId].push(_id);
        studentOffers[_applicantId].push(_id);
        activeOffers[_employmentHash][_organisationId][_applicantId] = _id;

        emit OfferCreated(_id, _organisationId, _applicantId);
    }

    function _validateOffer(uint256 offerId, bytes32 applicantId)
        internal
        view
        returns (EmploymentOffer storage offer)
    {
        offer = offers[offerId];

        if (offer.id == 0) revert OfferNotFound();
        if (offer.status != Types.RequestStatus.Pending) revert OfferAlreadyProcessed();
        if (offer.applicantId != applicantId) revert UnauthorizedStudent();
        if (offer.offerDeadline != 0 && offer.offerDeadline <= block.timestamp) {
            revert OfferExpired();
        }

        return offer;
    }

    function _closeOffer(
        EmploymentOffer storage offer,
        Types.RequestStatus status
    ) internal {
        offer.status = status;
        delete activeOffers[offer.employmentHash][offer.organisationId][offer.applicantId];
    }

    function acceptOffer(uint256 offerId, bytes32 applicantId) external onlyOwner {
        EmploymentOffer storage offer = _validateOffer(offerId, applicantId);

        offer.active = true;
        applicantManager.addEmployment(
            applicantId,
            offer.employmentHash,
            offer.employmentType,
            offer.organisationId
        );
        _closeOffer(offer, Types.RequestStatus.Approved);

        emit OfferAccepted(offerId);
    }

    function rejectOffer(uint256 offerId, bytes32 applicantId) external onlyOwner {
        EmploymentOffer storage offer = _validateOffer(offerId, applicantId);
        _closeOffer(offer, Types.RequestStatus.Rejected);

        emit OfferRejected(offerId);
    }

    function endEmployment(uint256 offerId, bytes32 organisationId) external onlyOwner {
        EmploymentOffer storage offer = offers[offerId];

        if (offer.id == 0) revert OfferNotFound();
        if (offer.organisationId != organisationId) revert UnauthorizedOrganisation();
        if (!offer.active) revert EmploymentNotActive();

        offer.active = false;
        applicantManager.endEmployment(offer.employmentHash);

        emit EmploymentEnded(offerId);
    }

    function getOrganisationOffers(bytes32 organisationId) external view returns (uint256[] memory) {
        return organisationOffers[organisationId];
    }

    function getStudentOffers(bytes32 applicantId) external view returns (uint256[] memory) {
        return studentOffers[applicantId];
    }

    function isCurrentlyActive(uint256 offerId) external view returns (bool) {
        return offers[offerId].active;
    }
}