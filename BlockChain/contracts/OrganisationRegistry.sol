// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./libraries/Types.sol";

contract OrganisationRegistry {

    //errors
    error OrganisationAlreadyRegistered();
    error OrganisationNotFound();
    error NotOwner();
    error InvalidAddress();

    //events
    event OrganisationRegistered(address indexed organisation, Types.OrganizationType organisationType);
    event OrganisationDeactivated(address indexed organisation);
    event OrganisationReactivated(address indexed organisation);

    //struct
    struct Organisation {
        bool exists;
        bool isActive;
        Types.OrganizationType organisationType;
    }

    //statevars
    mapping(address => Organisation) public organisations;

    address public immutable owner;

    //constructor
    constructor() {
        owner = msg.sender;
    }

    //modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    //functions
    function registerOrganisation(
        address _organisationAddress,
    
        Types.OrganizationType _organisationType
    ) external onlyOwner {

        if (_organisationAddress == address(0)) revert InvalidAddress();

        if (organisations[_organisationAddress].exists) {
            revert OrganisationAlreadyRegistered();
        }

        organisations[_organisationAddress] = Organisation({
            exists: true,
            isActive: true,
            organisationType: _organisationType
        });

        emit OrganisationRegistered(_organisationAddress, _organisationType);
    }

    function deactivateOrganisation(address _organisationAddress) external onlyOwner {

        Organisation storage organisation = organisations[_organisationAddress];

        if (!organisation.exists) revert OrganisationNotFound();

        organisation.isActive = false;

        emit OrganisationDeactivated(_organisationAddress);
    }

    function reactivateOrganisation(address _organisationAddress) external onlyOwner {

        Organisation storage organisation = organisations[_organisationAddress];

        if (!organisation.exists) revert OrganisationNotFound();

        organisation.isActive = true;

        emit OrganisationReactivated(_organisationAddress);
    }

    //view helper for other contracts (e.g. RequestManager) to check validity
    function isActiveOrganisation(address _organisationAddress) external view returns (bool) {
        return organisations[_organisationAddress].isActive;
    }


}
