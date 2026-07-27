// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./libraries/Types.sol";

contract IssuerRegistry {

    //errors
    error IssuerAlreadyRegistered();
    error IssuerNotFound();
    error NotOwner();
    error InvalidAddress();

    //events
    event IssuerRegistered(address indexed issuer, string name);
    event IssuerDeactivated(address indexed issuer);
    event IssuerReactivated(address indexed issuer);

    //struct
    struct Issuer {
        bool exists;
        bool isActive;
        string name;
    }

    //statevars
    mapping(address => Issuer) public issuers;

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
    function registerIssuer(
        address _issuerAddress,
        string calldata _name
    ) external onlyOwner {

        if (_issuerAddress == address(0)) revert InvalidAddress();

        if (issuers[_issuerAddress].exists) {
            revert IssuerAlreadyRegistered();
        }

        issuers[_issuerAddress] = Issuer({
            exists: true,
            isActive: true,
            name: _name
        });

        emit IssuerRegistered(_issuerAddress, _name);
    }

    function deactivateIssuer(address _issuerAddress) external onlyOwner {

        Issuer storage issuer = issuers[_issuerAddress];

        if (!issuer.exists) revert IssuerNotFound();

        issuer.isActive = false;

        emit IssuerDeactivated(_issuerAddress);
    }

    function reactivateIssuer(address _issuerAddress) external onlyOwner {

        Issuer storage issuer = issuers[_issuerAddress];

        if (!issuer.exists) revert IssuerNotFound();

        issuer.isActive = true;

        emit IssuerReactivated(_issuerAddress);
    }

    //view helper for other contracts (e.g. RequestManager) to check validity
    function isVerifiedIssuer(address _issuerAddress) external view returns (bool) {
        return issuers[_issuerAddress].isActive;
    }
}