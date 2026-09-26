const { expect } = require("chai");
const { ethers } = require("hardhat");

const CredentialType = {
  Certificate: 0,
  Project: 1,
  Internship: 2,
  Hackathon: 3,
  ResearchPaper: 4,
  Patent: 5,
};

const RequestType = {
  AddCertificate: 0,
  RevokeCertificate: 1,
  AddProjectVerification: 2,
  RevokeProjectVerification: 3,
  AddEmployment: 4,
  TerminateEmployment: 5,
};

const RequestStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Cancelled: 3,
};

const OrganizationType = {
  Company: 0,
  University: 1,
  ResearchLab: 2,
  NGO: 3,
  Government: 4,
  Other: 5,
};

// Helper: generate a random bytes32 ID
const randomId = () => ethers.hexlify(ethers.randomBytes(32));

describe("RequestManager", function () {
  let applicantManager, organisationRegistry, requestManager;
  let owner, other;

  // Use bytes32 IDs for everything
  const applicantId = randomId();
  const verifierId = randomId(); // organisation ID
  const unregisteredVerifierId = randomId();

  const certHash = ethers.keccak256(ethers.toUtf8Bytes("cert-1"));
  const projectHash = ethers.keccak256(ethers.toUtf8Bytes("project-1"));

  async function futureTimestamp(offsetSeconds = 3600) {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp + offsetSeconds;
  }

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();

    const ApplicantManager = await ethers.getContractFactory("ApplicantManager");
    applicantManager = await ApplicantManager.deploy();
    await applicantManager.waitForDeployment();

    const OrganisationRegistry = await ethers.getContractFactory("OrganisationRegistry");
    organisationRegistry = await OrganisationRegistry.deploy();
    await organisationRegistry.waitForDeployment();

    const RequestManager = await ethers.getContractFactory("RequestManager");
    requestManager = await RequestManager.deploy(
      await applicantManager.getAddress(),
      await organisationRegistry.getAddress()
    );
    await requestManager.waitForDeployment();

    // Wire ApplicantManager → RequestManager
    await applicantManager.connect(owner).setRequestManager(await requestManager.getAddress());

    // Register verifier organisation (as owner=backend)
    await organisationRegistry
      .connect(owner)
      .registerOrganisation(verifierId, OrganizationType.University);

    // Create applicant and project (as owner=backend)
    await applicantManager.connect(owner).createApplicant(applicantId);
    await applicantManager
      .connect(owner)
      .addProject(applicantId, projectHash);
  });

  describe("createRequest", function () {
    it("creates an AddCertificate request", async function () {
      const expiry = await futureTimestamp();

      const tx = await requestManager
        .connect(owner)
        .createRequest(
          certHash,
          CredentialType.Certificate,
          RequestType.AddCertificate,
          applicantId,
          verifierId,
          expiry
        );

      await expect(tx)
        .to.emit(requestManager, "RequestCreated")
        .withArgs(1, applicantId);

      const request = await requestManager.requests(1);
      expect(request.applicantId).to.equal(applicantId);
      expect(request.expectedVerifierId).to.equal(verifierId);
      expect(request.status).to.equal(RequestStatus.Pending);

      expect(
        await requestManager.activeRequests(certHash, verifierId, RequestType.AddCertificate)
      ).to.equal(1);
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        requestManager
          .connect(other)
          .createRequest(
            certHash,
            CredentialType.Certificate,
            RequestType.AddCertificate,
            applicantId,
            verifierId,
            0
          )
      ).to.be.revertedWithCustomError(requestManager, "NotOwner");
    });

    it("reverts if the credential/request type combo is invalid", async function () {
      // Certificate credential cannot use AddProjectVerification
      await expect(
        requestManager
          .connect(owner)
          .createRequest(
            certHash,
            CredentialType.Certificate,
            RequestType.AddProjectVerification,
            applicantId,
            verifierId,
            0
          )
      ).to.be.revertedWithCustomError(requestManager, "InvalidRequestType");

      // Project credential cannot use AddCertificate
      await expect(
        requestManager
          .connect(owner)
          .createRequest(
            projectHash,
            CredentialType.Project,
            RequestType.AddCertificate,
            applicantId,
            verifierId,
            0
          )
      ).to.be.revertedWithCustomError(requestManager, "InvalidRequestType");
    });

    it("reverts on a past expiry for AddCertificate", async function () {
      const past = (await ethers.provider.getBlock("latest")).timestamp - 1000;
      await expect(
        requestManager
          .connect(owner)
          .createRequest(
            certHash,
            CredentialType.Certificate,
            RequestType.AddCertificate,
            applicantId,
            verifierId,
            past
          )
      ).to.be.revertedWithCustomError(requestManager, "InvalidExpiry");
    });

    it("reverts if the expected verifier is not an active organisation", async function () {
      await expect(
        requestManager
          .connect(owner)
          .createRequest(
            certHash,
            CredentialType.Certificate,
            RequestType.AddCertificate,
            applicantId,
            unregisteredVerifierId,
            0
          )
      ).to.be.revertedWithCustomError(requestManager, "InvalidIssuer");
    });

    it("reverts if the expected verifier was deactivated", async function () {
      await organisationRegistry.connect(owner).deactivateOrganisation(verifierId);
      await expect(
        requestManager
          .connect(owner)
          .createRequest(
            certHash,
            CredentialType.Certificate,
            RequestType.AddCertificate,
            applicantId,
            verifierId,
            0
          )
      ).to.be.revertedWithCustomError(requestManager, "InvalidIssuer");
    });

    it("reverts if an identical active request already exists", async function () {
      await requestManager
        .connect(owner)
        .createRequest(
          certHash,
          CredentialType.Certificate,
          RequestType.AddCertificate,
          applicantId,
          verifierId,
          0
        );

      await expect(
        requestManager
          .connect(owner)
          .createRequest(
            certHash,
            CredentialType.Certificate,
            RequestType.AddCertificate,
            applicantId,
            verifierId,
            0
          )
      ).to.be.revertedWithCustomError(requestManager, "RequestAlreadyExists");
    });

    it("tracks requests per issuer (incoming) and per applicant (outgoing)", async function () {
      await requestManager
        .connect(owner)
        .createRequest(
          certHash,
          CredentialType.Certificate,
          RequestType.AddCertificate,
          applicantId,
          verifierId,
          0
        );

      expect(await requestManager.getIssuerRequests(verifierId)).to.deep.equal([1n]);
      expect(await requestManager.getStudentRequests(applicantId)).to.deep.equal([1n]);
    });
  });

  describe("approveRequest - AddCertificate", function () {
    beforeEach(async function () {
      await requestManager
        .connect(owner)
        .createRequest(
          certHash,
          CredentialType.Certificate,
          RequestType.AddCertificate,
          applicantId,
          verifierId,
          0
        );
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        requestManager.connect(other).approveRequest(1, verifierId)
      ).to.be.revertedWithCustomError(requestManager, "NotOwner");
    });

    it("reverts for an unknown request id", async function () {
      await expect(
        requestManager.connect(owner).approveRequest(999, verifierId)
      ).to.be.revertedWithCustomError(requestManager, "RequestNotFound");
    });

    it("reverts with wrong verifierId", async function () {
      await expect(
        requestManager.connect(owner).approveRequest(1, unregisteredVerifierId)
      ).to.be.revertedWithCustomError(requestManager, "UnauthorizedVerifier");
    });

    it("approves the request and adds certificate, clears activeRequests", async function () {
      await expect(requestManager.connect(owner).approveRequest(1, verifierId))
        .to.emit(requestManager, "RequestApproved")
        .withArgs(1);

      const cert = await applicantManager.certificates(certHash);
      expect(cert.organisationId).to.equal(verifierId);
      expect(cert.revoked).to.equal(false);

      const request = await requestManager.requests(1);
      expect(request.status).to.equal(RequestStatus.Approved);

      expect(
        await requestManager.activeRequests(certHash, verifierId, RequestType.AddCertificate)
      ).to.equal(0);
    });

    it("reverts if approved twice", async function () {
      await requestManager.connect(owner).approveRequest(1, verifierId);
      await expect(
        requestManager.connect(owner).approveRequest(1, verifierId)
      ).to.be.revertedWithCustomError(requestManager, "RequestAlreadyProcessed");
    });
  });

  describe("rejectRequest", function () {
    beforeEach(async function () {
      await requestManager
        .connect(owner)
        .createRequest(
          certHash,
          CredentialType.Certificate,
          RequestType.AddCertificate,
          applicantId,
          verifierId,
          0
        );
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        requestManager.connect(other).rejectRequest(1, verifierId)
      ).to.be.revertedWithCustomError(requestManager, "NotOwner");
    });

    it("reverts with wrong verifierId", async function () {
      await expect(
        requestManager.connect(owner).rejectRequest(1, unregisteredVerifierId)
      ).to.be.revertedWithCustomError(requestManager, "UnauthorizedVerifier");
    });

    it("rejects the request and clears the active slot without touching ApplicantManager", async function () {
      await expect(requestManager.connect(owner).rejectRequest(1, verifierId))
        .to.emit(requestManager, "RequestRejected")
        .withArgs(1);

      const request = await requestManager.requests(1);
      expect(request.status).to.equal(RequestStatus.Rejected);

      expect(
        await requestManager.activeRequests(certHash, verifierId, RequestType.AddCertificate)
      ).to.equal(0);

      // Certificate should not exist
      const cert = await applicantManager.certificates(certHash);
      expect(cert.certificateHash).to.equal(ethers.ZeroHash);
    });

    it("reverts if the request was already processed", async function () {
      await requestManager.connect(owner).rejectRequest(1, verifierId);
      await expect(
        requestManager.connect(owner).rejectRequest(1, verifierId)
      ).to.be.revertedWithCustomError(requestManager, "RequestAlreadyProcessed");
    });
  });

  describe("approveRequest - AddProjectVerification", function () {
    beforeEach(async function () {
      await requestManager
        .connect(owner)
        .createRequest(
          projectHash,
          CredentialType.Project,
          RequestType.AddProjectVerification,
          applicantId,
          verifierId,
          0
        );
    });

    it("verifies the project on approval", async function () {
      await requestManager.connect(owner).approveRequest(1, verifierId);
      expect(await applicantManager.isProjectVerified(projectHash)).to.equal(true);
    });
  });

  describe("end-to-end integration", function () {
    it("full lifecycle: create applicant → request cert → approve", async function () {
      await requestManager
        .connect(owner)
        .createRequest(
          certHash,
          CredentialType.Certificate,
          RequestType.AddCertificate,
          applicantId,
          verifierId,
          0
        );
      await requestManager.connect(owner).approveRequest(1, verifierId);

      const certs = await applicantManager.getCertificates(applicantId);
      expect(certs).to.deep.equal([certHash]);

      const cert = await applicantManager.certificates(certHash);
      expect(cert.revoked).to.equal(false);
    });
  });
});