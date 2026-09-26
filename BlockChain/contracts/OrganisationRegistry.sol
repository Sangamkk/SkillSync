// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./libraries/Types.sol";

contract OrganisationRegistry {
    error OrganisationAlreadyRegistered();
    error OrganisationNotFound();
    error NotOwner();
    error InvalidOrganisationId();

    event OrganisationRegistered(
        bytes32 indexed organisationId,
        Types.OrganizationType organisationType
    );
    event OrganisationDeactivated(bytes32 indexed organisationId);
    event OrganisationReactivated(bytes32 indexed organisationId);

    struct Organisation {
        bool exists;
        bool isActive;
        Types.OrganizationType organisationType;
    }

    mapping(bytes32 => Organisation) public organisations;
    address public immutable owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function registerOrganisation(
        bytes32 _organisationId,
        Types.OrganizationType _organisationType
    ) external onlyOwner {
        if (_organisationId == 0) revert InvalidOrganisationId();

        if (organisations[_organisationId].exists) {
            revert OrganisationAlreadyRegistered();
        }

        organisations[_organisationId] = Organisation({
            exists: true,
            isActive: true,
            organisationType: _organisationType
        });

        emit OrganisationRegistered(_organisationId, _organisationType);
    }

    function deactivateOrganisation(bytes32 _organisationId) external onlyOwner {
        Organisation storage organisation = organisations[_organisationId];

        if (!organisation.exists) revert OrganisationNotFound();

        organisation.isActive = false;

        emit OrganisationDeactivated(_organisationId);
    }

    function reactivateOrganisation(bytes32 _organisationId) external onlyOwner {
        Organisation storage organisation = organisations[_organisationId];

        if (!organisation.exists) revert OrganisationNotFound();

        organisation.isActive = true;

        emit OrganisationReactivated(_organisationId);
    }

    function isActiveOrganisation(bytes32 _organisationId) external view returns (bool) {
        return organisations[_organisationId].isActive;
    }
}