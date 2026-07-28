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

describe("RequestManager", function () {
  let applicantManager, organisationRegistry, requestManager;
  let owner, student, verifier, unregisteredVerifier, other;

  const certHash = ethers.keccak256(ethers.toUtf8Bytes("cert-1"));
  const projectHash = ethers.keccak256(ethers.toUtf8Bytes("project-1"));

  async function futureTimestamp(offsetSeconds = 3600) {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp + offsetSeconds;
  }

  beforeEach(async function () {
    [owner, student, verifier, unregisteredVerifier, other] = await ethers.getSigners();

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

    // wire ApplicantManager -> RequestManager (onlyRequestManager gate)
    await applicantManager.connect(owner).setRequestManager(await requestManager.getAddress());

    // register `verifier` as an active organisation (no name param anymore)
    await organisationRegistry
      .connect(owner)
      .registerOrganisation(verifier.address, OrganizationType.University);

    // student + project setup used by several tests
    await applicantManager.connect(student).createApplicant();
    await applicantManager.connect(student).addProject(projectHash);
  });

  describe("createRequest", function () {
    it("creates an AddCertificate request", async function () {
      const expiry = await futureTimestamp();

      const tx = await requestManager
        .connect(student)
        .createRequest(certHash, CredentialType.Certificate, RequestType.AddCertificate, verifier.address, expiry);

      await expect(tx).to.emit(requestManager, "RequestCreated").withArgs(1, student.address);

      const request = await requestManager.requests(1);
      expect(request.student).to.equal(student.address);
      expect(request.expectedVerifier).to.equal(verifier.address);
      expect(request.status).to.equal(RequestStatus.Pending);

      expect(await requestManager.activeRequests(certHash, verifier.address, RequestType.AddCertificate)).to.equal(1);
    });

    it("reverts if the credential/request type combo is invalid", async function () {
      await expect(
        requestManager
          .connect(student)
          .createRequest(certHash, CredentialType.Certificate, RequestType.AddProjectVerification, verifier.address, 0)
      ).to.be.revertedWithCustomError(requestManager, "InvalidRequestType");

      await expect(
        requestManager
          .connect(student)
          .createRequest(projectHash, CredentialType.Project, RequestType.AddCertificate, verifier.address, 0)
      ).to.be.revertedWithCustomError(requestManager, "InvalidRequestType");
    });

    it("reverts on a past expiry for AddCertificate", async function () {
      const past = (await ethers.provider.getBlock("latest")).timestamp - 1000;
      await expect(
        requestManager
          .connect(student)
          .createRequest(certHash, CredentialType.Certificate, RequestType.AddCertificate, verifier.address, past)
      ).to.be.revertedWithCustomError(requestManager, "InvalidExpiry");
    });

    it("reverts if the expected verifier isn't a verified organisation", async function () {
      await expect(
        requestManager
          .connect(student)
          .createRequest(
            certHash,
            CredentialType.Certificate,
            RequestType.AddCertificate,
            unregisteredVerifier.address,
            0
          )
      ).to.be.revertedWithCustomError(requestManager, "InvalidIssuer");
    });

    it("reverts if the expected verifier was deactivated", async function () {
      await organisationRegistry.connect(owner).deactivateOrganisation(verifier.address);
      await expect(
        requestManager
          .connect(student)
          .createRequest(certHash, CredentialType.Certificate, RequestType.AddCertificate, verifier.address, 0)
      ).to.be.revertedWithCustomError(requestManager, "InvalidIssuer");
    });

    it("reverts if an identical active request already exists", async function () {
      await requestManager
        .connect(student)
        .createRequest(certHash, CredentialType.Certificate, RequestType.AddCertificate, verifier.address, 0);

      await expect(
        requestManager
          .connect(student)
          .createRequest(certHash, CredentialType.Certificate, RequestType.AddCertificate, verifier.address, 0)
      ).to.be.revertedWithCustomError(requestManager, "RequestAlreadyExists");
    });

    it("tracks requests per issuer (incoming) and per student (outgoing)", async function () {
      await requestManager
        .connect(student)
        .createRequest(certHash, CredentialType.Certificate, RequestType.AddCertificate, verifier.address, 0);

      expect(await requestManager.connect(verifier).getIssuerRequests()).to.deep.equal([1n]);
      expect(await requestManager.connect(student).getStudentRequests()).to.deep.equal([1n]);
    });
  });

  describe("approveRequest - AddCertificate", function () {
    beforeEach(async function () {
      await requestManager
        .connect(student)
        .createRequest(certHash, CredentialType.Certificate, RequestType.AddCertificate, verifier.address, 0);
    });

    it("reverts if called by someone other than the expected verifier", async function () {
      await expect(
        requestManager.connect(other).approveRequest(1)
      ).to.be.revertedWithCustomError(requestManager, "UnauthorizedVerifier");
    });

    it("reverts for an unknown request id", async function () {
      await expect(
        requestManager.connect(verifier).approveRequest(999)
      ).to.be.revertedWithCustomError(requestManager, "RequestNotFound");
    });

    it("approves the request, adds the certificate, and clears activeRequests", async function () {
      await expect(requestManager.connect(verifier).approveRequest(1))
        .to.emit(requestManager, "RequestApproved")
        .withArgs(1);

      const cert = await applicantManager.certificates(certHash);
      expect(cert.issuer).to.equal(verifier.address);

      const request = await requestManager.requests(1);
      expect(request.status).to.equal(RequestStatus.Approved);

      expect(
        await requestManager.activeRequests(certHash, verifier.address, RequestType.AddCertificate)
      ).to.equal(0);
    });

    it("reverts if approved twice", async function () {
      await requestManager.connect(verifier).approveRequest(1);
      await expect(
        requestManager.connect(verifier).approveRequest(1)
      ).to.be.revertedWithCustomError(requestManager, "RequestAlreadyProcessed");
    });

    it("allows a new request for the same credential after the slot is cleared", async function () {
      await requestManager.connect(verifier).approveRequest(1);

      await expect(
        requestManager
          .connect(student)
          .createRequest(certHash, CredentialType.Certificate, RequestType.RevokeCertificate, verifier.address, 0)
      ).to.emit(requestManager, "RequestCreated");
    });
  });

  describe("rejectRequest", function () {
    beforeEach(async function () {
      await requestManager
        .connect(student)
        .createRequest(certHash, CredentialType.Certificate, RequestType.AddCertificate, verifier.address, 0);
    });

    it("reverts if called by someone other than the expected verifier", async function () {
      await expect(
        requestManager.connect(other).rejectRequest(1)
      ).to.be.revertedWithCustomError(requestManager, "UnauthorizedVerifier");
    });

    it("rejects the request and clears the active slot without touching ApplicantManager state", async function () {
      await expect(requestManager.connect(verifier).rejectRequest(1))
        .to.emit(requestManager, "RequestRejected")
        .withArgs(1);

      const request = await requestManager.requests(1);
      expect(request.status).to.equal(RequestStatus.Rejected);

      expect(
        await requestManager.activeRequests(certHash, verifier.address, RequestType.AddCertificate)
      ).to.equal(0);

      const cert = await applicantManager.certificates(certHash);
      expect(cert.issuer).to.equal(ethers.ZeroAddress);
    });

    it("reverts if the request was already processed", async function () {
      await requestManager.connect(verifier).rejectRequest(1);
      await expect(
        requestManager.connect(verifier).rejectRequest(1)
      ).to.be.revertedWithCustomError(requestManager, "RequestAlreadyProcessed");
    });
  });

  describe("approveRequest - RevokeCertificate", function () {
    beforeEach(async function () {
      await requestManager
        .connect(student)
        .createRequest(certHash, CredentialType.Certificate, RequestType.AddCertificate, verifier.address, 0);
      await requestManager.connect(verifier).approveRequest(1);

      await requestManager
        .connect(student)
        .createRequest(certHash, CredentialType.Certificate, RequestType.RevokeCertificate, verifier.address, 0);
    });

    it("revokes the certificate on approval", async function () {
      await requestManager.connect(verifier).approveRequest(2);

      const cert = await applicantManager.certificates(certHash);
      expect(cert.revoked).to.equal(true);
    });
  });

  describe("approveRequest - AddProjectVerification / RevokeProjectVerification", function () {
    beforeEach(async function () {
      await requestManager
        .connect(student)
        .createRequest(
          projectHash,
          CredentialType.Project,
          RequestType.AddProjectVerification,
          verifier.address,
          0
        );
    });

    it("verifies the project on approval", async function () {
      await requestManager.connect(verifier).approveRequest(1);
      expect(await applicantManager.isProjectVerified(projectHash)).to.equal(true);
    });

    it("revokes the verification through a follow-up request", async function () {
      await requestManager.connect(verifier).approveRequest(1);

      await requestManager
        .connect(student)
        .createRequest(
          projectHash,
          CredentialType.Project,
          RequestType.RevokeProjectVerification,
          verifier.address,
          0
        );
      await requestManager.connect(verifier).approveRequest(2);

      expect(await applicantManager.isProjectVerified(projectHash)).to.equal(false);
    });
  });

  describe("onlyRequestManager gate on ApplicantManager", function () {
    it("ApplicantManager rejects calls to gated functions from anyone but RequestManager", async function () {
      await expect(
        applicantManager
          .connect(student)
          .addCertificate(student.address, certHash, CredentialType.Certificate, verifier.address, 0)
      ).to.be.revertedWithCustomError(applicantManager, "UnauthorisedOperation");

      await expect(
        applicantManager.connect(student).addProjectVerification(projectHash, verifier.address)
      ).to.be.revertedWithCustomError(applicantManager, "UnauthorisedOperation");
    });

    it("only RequestManager's address (set once by owner) can call gated functions", async function () {
      expect(await applicantManager.requestManager()).to.equal(await requestManager.getAddress());
    });
  });

  describe("end-to-end integration", function () {
    it("full lifecycle: create applicant -> request cert -> approve -> revoke -> reject unrelated request", async function () {
      const certHash2 = ethers.keccak256(ethers.toUtf8Bytes("cert-2"));
      await applicantManager.connect(other).createApplicant();

      await requestManager
        .connect(student)
        .createRequest(certHash, CredentialType.Certificate, RequestType.AddCertificate, verifier.address, 0);
      await requestManager
        .connect(other)
        .createRequest(certHash2, CredentialType.Certificate, RequestType.AddCertificate, verifier.address, 0);

      await requestManager.connect(verifier).approveRequest(1);
      await requestManager.connect(verifier).rejectRequest(2);

      const certs1 = await applicantManager.getCertificates(student.address);
      expect(certs1).to.deep.equal([certHash]);

      const certs2 = await applicantManager.getCertificates(other.address);
      expect(certs2).to.deep.equal([]);

      await requestManager
        .connect(student)
        .createRequest(certHash, CredentialType.Certificate, RequestType.RevokeCertificate, verifier.address, 0);
      await requestManager.connect(verifier).approveRequest(3);

      const cert = await applicantManager.certificates(certHash);
      expect(cert.revoked).to.equal(true);
    });
  });
});