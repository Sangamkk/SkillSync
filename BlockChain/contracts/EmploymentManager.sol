// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./libraries/Types.sol";
import "./ApplicantManager.sol";
import "./OrganisationRegistry.sol";

contract EmploymentManager {

    //errors
    error OfferAlreadyExists(uint256 offerId);
    error OfferNotFound();
    error OfferAlreadyProcessed();
    error UnauthorizedStudent();
    error UnauthorizedOrganisation();
    error InvalidOrganisation();
    error EmploymentNotActive();
    error InvalidExpiry();
    error OfferExpired();

    //events
    event OfferCreated(uint256 indexed id, address indexed organisation, address indexed student);
    event OfferAccepted(uint256 indexed id);
    event OfferRejected(uint256 indexed id);
    event EmploymentEnded(uint256 indexed id);

    //constructor
    constructor(address applicantManagerAddress, address organisationRegistryAddress) {
        applicantManager = ApplicantManager(applicantManagerAddress);
        organisationRegistry = OrganisationRegistry(organisationRegistryAddress);
    }

    //struct
struct EmploymentOffer {
    uint256 id;
    bytes32 employmentHash;
    Types.EmploymentType employmentType;
    address organisation;
    address student;
    Types.RequestStatus status;
    bool active;
    uint64 offerDeadline;
}
    //statevars
    mapping(uint256 => EmploymentOffer) public offers;

    mapping(address => uint256[]) private organisationOffers;
    mapping(address => uint256[]) private studentOffers;

    // employmentHash -> organisation -> student -> offerId  (dedup, mirrors activeRequests)
    mapping(bytes32 => mapping(address => mapping(address => uint256)))
        public activeOffers;

    uint256 public nextOfferId;

    //contracts
    ApplicantManager public immutable applicantManager;
    OrganisationRegistry public immutable organisationRegistry;


    //functions

    // organisation initiates
function createOffer(
    bytes32 _employmentHash,
    Types.EmploymentType _employmentType,
    address _student,
    uint64 _offerDeadline
) external {

    if (activeOffers[_employmentHash][msg.sender][_student] != 0) {
        revert OfferAlreadyExists(
            activeOffers[_employmentHash][msg.sender][_student]
        );
    }

    if (!organisationRegistry.isActiveOrganisation(msg.sender)) {
        revert InvalidOrganisation();
    }

    if (_offerDeadline != 0 && _offerDeadline <= block.timestamp) {
        revert InvalidExpiry();
    }

    uint256 _id = ++nextOfferId;

    offers[_id] = EmploymentOffer({
        id: _id,
        employmentHash: _employmentHash,
        employmentType: _employmentType,
        organisation: msg.sender,
        student: _student,
        status: Types.RequestStatus.Pending,
        active: false,
        offerDeadline: _offerDeadline
    });

    organisationOffers[msg.sender].push(_id);
    studentOffers[_student].push(_id);

    activeOffers[_employmentHash][msg.sender][_student] = _id;

    emit OfferCreated(_id, msg.sender, _student);
}

   // internal: dedup / validity checks before accept/reject
function _validateOffer(uint256 offerId) internal view returns (EmploymentOffer storage offer) {

    offer = offers[offerId];

    if (offer.id == 0)
        revert OfferNotFound();

    if (offer.status != Types.RequestStatus.Pending)
        revert OfferAlreadyProcessed();

    if (offer.student != msg.sender)
        revert UnauthorizedStudent();

    if(offer.offerDeadline != 0 && offer.offerDeadline <= block.timestamp){
        revert OfferExpired(); 
    }

    return offer;
}

// internal: finalize status + clear active slot
function _closeOffer(
    EmploymentOffer storage offer,
    Types.RequestStatus status
) internal {

    offer.status = status;

    delete activeOffers[
        offer.employmentHash
    ][
        offer.organisation
    ][
        offer.student
    ];
}

// student accepts
function acceptOffer(uint256 offerId) external {

    EmploymentOffer storage offer = _validateOffer(offerId);


    offer.active = true;

    applicantManager.addEmployment(
        offer.student,
        offer.employmentHash,
        offer.employmentType,
        offer.organisation
    );

    _closeOffer(offer, Types.RequestStatus.Approved);

    emit OfferAccepted(offerId);
}

// student rejects
function rejectOffer(uint256 offerId) external {

    EmploymentOffer storage offer = _validateOffer(offerId);

    _closeOffer(offer, Types.RequestStatus.Rejected);

    emit OfferRejected(offerId);
}

// organisation ends an active employment (not a "revoke")
function endEmployment(uint256 offerId) external {

    EmploymentOffer storage offer = offers[offerId];

    if (offer.id == 0)
        revert OfferNotFound();

    if (offer.organisation != msg.sender)
        revert UnauthorizedOrganisation();

    if (!offer.active)
        revert EmploymentNotActive();

    offer.active = false;

    applicantManager.endEmployment(offer.employmentHash);

    emit EmploymentEnded(offerId);
}

//getters phase2
function getOrganisationOffers() external view returns (uint256[] memory) {
    return organisationOffers[msg.sender];
}

function getStudentOffers() external view returns (uint256[] memory) {
    return studentOffers[msg.sender];
}

function isCurrentlyActive(uint256 offerId) external view returns (bool) {
    return offers[offerId].active;
}
}