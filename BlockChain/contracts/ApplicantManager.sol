// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./libraries/Types.sol";

contract ApplicantManager{
//errors

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

error NotOwner();

error EmploymentAlreadyExists();

error EmploymentNotFound();

error EmploymentAlreadyTerminated();

error EmploymentManagerAlreadySet();


//events
event ApplicantCreated(address  indexed applicantaddress);

event CertificateAdded(address indexed student,bytes32 indexed certificateHash,address indexed issuer);

event CertificateRevoked(bytes32 indexed certificateHash, address indexed  issuer);

event Projectadded( address indexed student,bytes32 indexed  projectHash );

event Projectverified(address indexed verifier,bytes32 indexed projecthash);

 event ProjectVerificationRevoked(address indexed verifier,bytes32 indexed projectHash);

 event EmploymentAdded(address indexed student,bytes32 indexed employmentHash,address indexed organisation);

event EmploymentTerminated(bytes32 indexed employmentHash,address indexed organisation);


 //variables

address public employmentManager;
address public requestManager;
address public immutable owner;


//structs


struct Certificate {
    bytes32 certificateHash;
    Types.CredentialType credentialType;
    address issuer;
    uint64 issuedAt;
    uint64 expiresAt;
    bool revoked;
}

struct Project {
    bool exists;
    bytes32 projectHash;
    address owner;
    Types.Verification[] verifications;
}



struct Employment {
    bool exists;
    bytes32 employmentHash;
    address organisation;
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




//mapping

mapping(address=>Applicant) public applicants;

mapping(bytes32 => Certificate) public certificates;

mapping(bytes32 => Project) public projects;

mapping(bytes32 => Employment) public employments;

//modifier



modifier onlyOwner() {
    if (msg.sender != owner) revert NotOwner();
    _;
}
modifier onlyRequestManager(){
    if(msg.sender!=requestManager){
        revert UnauthorisedOperation();
    }
    _;
}
modifier onlyEmploymentManager(){
    if(msg.sender!=employmentManager){
        revert UnauthorisedOperation();
    }
    _;
}
//constructor

constructor() {
    owner = msg.sender;
}

//owner sets reqmanager
function setRequestManager(address _requestManager)
    external
    onlyOwner
{
    if (requestManager != address(0)) {
        revert RequestManagerAlreadySet();
    }

    requestManager = _requestManager;
}
//sets employmanager 
function setEmploymentManager(address _employmentManager) external onlyOwner {
    if (employmentManager != address(0)) revert EmploymentManagerAlreadySet();
    employmentManager = _employmentManager;
}



//applicant

//directly called by appllicant
function createApplicant() external {

    if(applicants[msg.sender].exists){
        revert ApplicantAlreadyExists();
    }

    applicants[msg.sender].exists = true;

    emit ApplicantCreated(msg.sender);
}


//certificate
function addCertificate(
    address student,
    bytes32 certificateHash,
    Types.CredentialType credentialType,
    address issuer,
    uint64 expiresAt
) external onlyRequestManager{

    if (!applicants[student].exists) {
        revert ApplicantNotFound();
    }

if (
    credentialType == Types.CredentialType.Project
) {
    revert InvalidCredentialType();
}


if (
    expiresAt != 0 &&
    expiresAt <= block.timestamp
){
        revert InvalidExpiry();
}


Certificate storage cert = certificates[certificateHash];

if (cert.issuer != address(0)) {
    revert CertificateAlreadyExists();
}


    certificates[certificateHash] = Certificate({
        certificateHash: certificateHash,
        credentialType: credentialType,
        issuer: issuer,
        issuedAt: uint64(block.timestamp),
        expiresAt: expiresAt,
        revoked: false
    });
    
    applicants[student].certificates.push(certificateHash);

    emit CertificateAdded(student,certificateHash,issuer);
}




function revokeCertificate(bytes32 certificateHash) external onlyRequestManager{

    Certificate storage cert = certificates[certificateHash];

    if (cert.issuer == address(0))
        revert CertificateNotFound();

    if (cert.revoked)
        revert CertificateAlreadyRevoked();

    cert.revoked = true;

    emit CertificateRevoked(certificateHash, cert.issuer);
}

//project


//addproject directly called by the applicant no req needed
function addProject(
    bytes32 projectHash
) external {
    address student=msg.sender;

    if (!applicants[student].exists) {
        revert ApplicantNotFound();
    }

    if (projects[projectHash].exists) {
        revert ProjectAlreadyExists();
    }

Project storage project = projects[projectHash];

project.exists = true;
project.projectHash = projectHash;
project.owner = student;
    applicants[student].projects.push(projectHash);

    emit Projectadded(student, projectHash);
}



function addProjectVerification(
    bytes32 projectHash,
    address verifier
) external onlyRequestManager{

    if (!projects[projectHash].exists) {
        revert ProjectNotFound();
    }

    Project storage project = projects[projectHash];

    for (uint256 i = 0; i < project.verifications.length; i++) {
        if (
            project.verifications[i].verifier == verifier &&
            !project.verifications[i].revoked
        ) {
            revert AlreadyVerifiedByIssuer();
        }
    }

    project.verifications.push(
        Types.Verification({
            verifier: verifier,
            verifiedAt: uint64(block.timestamp),
            revoked: false
        })
    );



    emit Projectverified(verifier,projectHash);
}


function revokeProjectVerification(
    bytes32 projectHash,
    address verifier
) external onlyRequestManager{

    if (!projects[projectHash].exists) {
        revert ProjectNotFound();
    }

    Project storage project = projects[projectHash];

    bool found = false;

    for (uint256 i = 0; i < project.verifications.length; i++) {

        if (project.verifications[i].verifier == verifier) {

            found = true;

            if (project.verifications[i].revoked) {
                revert ProjectVerificationAlreadyRevoked();
            }

            project.verifications[i].revoked = true;

            emit ProjectVerificationRevoked(
                verifier,
                projectHash
            );

            return;
        }
    }

    if (!found) {
        revert VerificationNotFound();
    }
}


//employment


function addEmployment(
    address student,
    bytes32 employmentHash,
    Types.EmploymentType employmentType,
    address organisation
) external onlyEmploymentManager {



if (!applicants[student].exists)
    revert ApplicantNotFound();

if (employments[employmentHash].exists)
    revert EmploymentAlreadyExists();



Employment storage employment = employments[employmentHash];

employment.exists = true;
employment.employmentHash = employmentHash;
employment.organisation = organisation;
employment.employmentType = employmentType;
employment.joinedAt = uint64(block.timestamp);

applicants[student].employments.push(employmentHash);

emit EmploymentAdded(student,employmentHash,organisation);

}

function endEmployment(bytes32 employmentHash) external onlyEmploymentManager{
Employment storage employment = employments[employmentHash];

if (!employment.exists)
    revert EmploymentNotFound();

if (employment.endedAt != 0)
    revert EmploymentAlreadyTerminated();

employment.endedAt = uint64(block.timestamp);

emit EmploymentTerminated(employmentHash,employment.organisation);
}


//getters
function isProjectVerified(bytes32 projectHash)
    public
    view
    returns (bool)
{
    if (!projects[projectHash].exists) {
    revert ProjectNotFound();
}
    Project storage project = projects[projectHash];

    for (uint256 i = 0; i < project.verifications.length; i++) {
        if (!project.verifications[i].revoked) {
            return true;
        }
    }

    return false;
}


function getProjectVerifications(
    bytes32 projectHash
)
    external
    view
    returns (Types.Verification[] memory)
{
    if (!projects[projectHash].exists) {
    revert ProjectNotFound();
}
    return projects[projectHash].verifications;
}

function getCertificates(address student)
    external
    view
    returns(bytes32[] memory){
        if (!applicants[student].exists) {
    revert ApplicantNotFound();
}
        return applicants[student].certificates;
    }


    function getProjects(address student)
    external
    view
    returns(bytes32[] memory){
         if (!applicants[student].exists) {
    revert ApplicantNotFound();
}

return applicants[student].projects;

    }


    function getEmployments(address student)
    external
    view
    returns (bytes32[] memory)
{
    if (!applicants[student].exists) {
        revert ApplicantNotFound();
    }

    return applicants[student].employments;
}
function isEmploymentActive(
    bytes32 employmentHash
)
    external
    view
    returns (bool)
{
    Employment storage employment = employments[employmentHash];

    if (!employment.exists)
        revert EmploymentNotFound();

    return employment.endedAt == 0;
}


//checking during login
    function applicantExists(address student)
    external
    view
    returns (bool)
{
    return applicants[student].exists;
}


}