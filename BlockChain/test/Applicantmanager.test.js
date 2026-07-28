const { expect } = require("chai");
const { ethers } = require("hardhat");

// Types.CredentialType enum order: Certificate, Project, Internship, Hackathon, ResearchPaper, Patent
const CredentialType = {
  Certificate: 0,
  Project: 1,
  Internship: 2,
  Hackathon: 3,
  ResearchPaper: 4,
  Patent: 5,
};

describe("ApplicantManager", function () {
  let applicantManager;
  let owner, requestManager, student, issuer, other;

  const certHash = ethers.keccak256(ethers.toUtf8Bytes("cert-1"));
  const projectHash = ethers.keccak256(ethers.toUtf8Bytes("project-1"));

  beforeEach(async function () {
    [owner, requestManager, student, issuer, other] = await ethers.getSigners();

    const ApplicantManager = await ethers.getContractFactory("ApplicantManager");
    applicantManager = await ApplicantManager.deploy();
    await applicantManager.waitForDeployment();

    // wire up requestManager so onlyRequestManager-gated functions can be tested
    await applicantManager.connect(owner).setRequestManager(requestManager.address);
  });

  describe("setRequestManager", function () {
    it("lets the owner set it once", async function () {
      expect(await applicantManager.requestManager()).to.equal(requestManager.address);
    });

    it("reverts on a second call", async function () {
      await expect(
        applicantManager.connect(owner).setRequestManager(other.address)
      ).to.be.revertedWithCustomError(applicantManager, "RequestManagerAlreadySet");
    });

    it("reverts if called by a non-owner", async function () {
      const ApplicantManager = await ethers.getContractFactory("ApplicantManager");
      const fresh = await ApplicantManager.deploy();
      await expect(
        fresh.connect(other).setRequestManager(other.address)
      ).to.be.revertedWithCustomError(fresh, "NotOwner");
    });
  });

  describe("createApplicant", function () {
    it("creates an applicant", async function () {
      await expect(applicantManager.connect(student).createApplicant())
        .to.emit(applicantManager, "ApplicantCreated")
        .withArgs(student.address);

expect(
    await applicantManager.applicantExists(student.address)
).to.equal(true);
    });

    it("reverts if the applicant already exists", async function () {
      await applicantManager.connect(student).createApplicant();
      await expect(
        applicantManager.connect(student).createApplicant()
      ).to.be.revertedWithCustomError(applicantManager, "ApplicantAlreadyExists");
    });
  });

  describe("addCertificate", function () {
    beforeEach(async function () {
      await applicantManager.connect(student).createApplicant();
    });

    it("reverts if not called by requestManager", async function () {
      await expect(
        applicantManager
          .connect(other)
          .addCertificate(student.address, certHash, CredentialType.Certificate, issuer.address, 0)
      ).to.be.revertedWithCustomError(applicantManager, "UnauthorisedOperation");
    });

    it("reverts if the student doesn't exist", async function () {
      await expect(
        applicantManager
          .connect(requestManager)
          .addCertificate(other.address, certHash, CredentialType.Certificate, issuer.address, 0)
      ).to.be.revertedWithCustomError(applicantManager, "ApplicantNotFound");
    });

    it("reverts on CredentialType.Project", async function () {
      await expect(
        applicantManager
          .connect(requestManager)
          .addCertificate(student.address, certHash, CredentialType.Project, issuer.address, 0)
      ).to.be.revertedWithCustomError(applicantManager, "InvalidCredentialType");
    });

    it("reverts on an expiry in the past", async function () {
      const past = (await ethers.provider.getBlock("latest")).timestamp - 1000;
      await expect(
        applicantManager
          .connect(requestManager)
          .addCertificate(student.address, certHash, CredentialType.Certificate, issuer.address, past)
      ).to.be.revertedWithCustomError(applicantManager, "InvalidExpiry");
    });

    it("adds a certificate with expiresAt = 0 (no expiry)", async function () {
      await expect(
        applicantManager
          .connect(requestManager)
          .addCertificate(student.address, certHash, CredentialType.Certificate, issuer.address, 0)
      )
        .to.emit(applicantManager, "CertificateAdded")
        .withArgs(student.address, certHash, issuer.address);

      const cert = await applicantManager.certificates(certHash);
      expect(cert.issuer).to.equal(issuer.address);
      expect(cert.revoked).to.equal(false);

      const certs = await applicantManager.getCertificates(student.address);
      expect(certs).to.deep.equal([certHash]);
    });

    it("reverts if the certificate hash already exists", async function () {
      await applicantManager
        .connect(requestManager)
        .addCertificate(student.address, certHash, CredentialType.Certificate, issuer.address, 0);

      await expect(
        applicantManager
          .connect(requestManager)
          .addCertificate(student.address, certHash, CredentialType.Certificate, issuer.address, 0)
      ).to.be.revertedWithCustomError(applicantManager, "CertificateAlreadyExists");
    });
  });

  describe("revokeCertificate", function () {
    beforeEach(async function () {
      await applicantManager.connect(student).createApplicant();
      await applicantManager
        .connect(requestManager)
        .addCertificate(student.address, certHash, CredentialType.Certificate, issuer.address, 0);
    });

    it("reverts if not called by requestManager", async function () {
      await expect(
        applicantManager.connect(other).revokeCertificate(certHash)
      ).to.be.revertedWithCustomError(applicantManager, "UnauthorisedOperation");
    });

    it("reverts for an unknown certificate", async function () {
      const unknown = ethers.keccak256(ethers.toUtf8Bytes("nope"));
      await expect(
        applicantManager.connect(requestManager).revokeCertificate(unknown)
      ).to.be.revertedWithCustomError(applicantManager, "CertificateNotFound");
    });

    it("revokes a certificate", async function () {
      await expect(applicantManager.connect(requestManager).revokeCertificate(certHash))
        .to.emit(applicantManager, "CertificateRevoked")
        .withArgs(certHash, issuer.address);

      const cert = await applicantManager.certificates(certHash);
      expect(cert.revoked).to.equal(true);
    });

    it("reverts if already revoked", async function () {
      await applicantManager.connect(requestManager).revokeCertificate(certHash);
      await expect(
        applicantManager.connect(requestManager).revokeCertificate(certHash)
      ).to.be.revertedWithCustomError(applicantManager, "CertificateAlreadyRevoked");
    });
  });

  describe("addProject", function () {
    beforeEach(async function () {
      await applicantManager.connect(student).createApplicant();
    });

    it("reverts if the caller isn't a registered applicant", async function () {
      await expect(
        applicantManager.connect(other).addProject(projectHash)
      ).to.be.revertedWithCustomError(applicantManager, "ApplicantNotFound");
    });

    it("adds a project directly (no requestManager needed)", async function () {
      await expect(applicantManager.connect(student).addProject(projectHash))
        .to.emit(applicantManager, "Projectadded")
        .withArgs(student.address, projectHash);

      const project = await applicantManager.projects(projectHash);
      expect(project.exists).to.equal(true);
      expect(project.owner).to.equal(student.address);

      const projects = await applicantManager.getProjects(student.address);
      expect(projects).to.deep.equal([projectHash]);
    });

    it("reverts if the project already exists", async function () {
      await applicantManager.connect(student).addProject(projectHash);
      await expect(
        applicantManager.connect(student).addProject(projectHash)
      ).to.be.revertedWithCustomError(applicantManager, "ProjectAlreadyExists");
    });
  });

  describe("addProjectVerification / revokeProjectVerification", function () {
    beforeEach(async function () {
      await applicantManager.connect(student).createApplicant();
      await applicantManager.connect(student).addProject(projectHash);
    });

    it("reverts if not called by requestManager", async function () {
      await expect(
        applicantManager.connect(other).addProjectVerification(projectHash, issuer.address)
      ).to.be.revertedWithCustomError(applicantManager, "UnauthorisedOperation");
    });

    it("reverts for an unknown project", async function () {
      const unknown = ethers.keccak256(ethers.toUtf8Bytes("nope"));
      await expect(
        applicantManager.connect(requestManager).addProjectVerification(unknown, issuer.address)
      ).to.be.revertedWithCustomError(applicantManager, "ProjectNotFound");
    });

    it("adds a verification and marks the project verified", async function () {
      await expect(
        applicantManager.connect(requestManager).addProjectVerification(projectHash, issuer.address)
      )
        .to.emit(applicantManager, "Projectverified")
        .withArgs(issuer.address, projectHash);

      expect(await applicantManager.isProjectVerified(projectHash)).to.equal(true);

      const verifications = await applicantManager.getProjectVerifications(projectHash);
      expect(verifications.length).to.equal(1);
      expect(verifications[0].verifier).to.equal(issuer.address);
      expect(verifications[0].revoked).to.equal(false);
    });

    it("reverts if the same verifier verifies twice while active", async function () {
      await applicantManager.connect(requestManager).addProjectVerification(projectHash, issuer.address);
      await expect(
        applicantManager.connect(requestManager).addProjectVerification(projectHash, issuer.address)
      ).to.be.revertedWithCustomError(applicantManager, "AlreadyVerifiedByIssuer");
    });

    it("allows a different verifier to verify the same project", async function () {
      await applicantManager.connect(requestManager).addProjectVerification(projectHash, issuer.address);
      await applicantManager.connect(requestManager).addProjectVerification(projectHash, other.address);

      const verifications = await applicantManager.getProjectVerifications(projectHash);
      expect(verifications.length).to.equal(2);
    });

    it("revokes a verification", async function () {
      await applicantManager.connect(requestManager).addProjectVerification(projectHash, issuer.address);

      await expect(
        applicantManager.connect(requestManager).revokeProjectVerification(projectHash, issuer.address)
      )
        .to.emit(applicantManager, "ProjectVerificationRevoked")
        .withArgs(issuer.address, projectHash);

      expect(await applicantManager.isProjectVerified(projectHash)).to.equal(false);
    });

    it("reverts revoking a verification twice", async function () {
      await applicantManager.connect(requestManager).addProjectVerification(projectHash, issuer.address);
      await applicantManager.connect(requestManager).revokeProjectVerification(projectHash, issuer.address);

      await expect(
        applicantManager.connect(requestManager).revokeProjectVerification(projectHash, issuer.address)
      ).to.be.revertedWithCustomError(applicantManager, "ProjectVerificationAlreadyRevoked");
    });

    it("reverts revoking a verification that was never made", async function () {
      await expect(
        applicantManager.connect(requestManager).revokeProjectVerification(projectHash, issuer.address)
      ).to.be.revertedWithCustomError(applicantManager, "VerificationNotFound");
    });

    it("allows re-verification by the same issuer after their prior verification was revoked", async function () {
      await applicantManager.connect(requestManager).addProjectVerification(projectHash, issuer.address);
      await applicantManager.connect(requestManager).revokeProjectVerification(projectHash, issuer.address);

      // Note: the current loop matches the FIRST entry for `verifier` regardless of revoked
      // status, so re-adding the same verifier after revocation is expected to succeed since
      // the "AlreadyVerifiedByIssuer" check only rejects when an *active* (non-revoked) entry exists.
      await expect(
        applicantManager.connect(requestManager).addProjectVerification(projectHash, issuer.address)
      ).to.emit(applicantManager, "Projectverified");
    });
  });

  describe("view getters", function () {
    it("isProjectVerified reverts for unknown project", async function () {
      await expect(
        applicantManager.isProjectVerified(projectHash)
      ).to.be.revertedWithCustomError(applicantManager, "ProjectNotFound");
    });

    it("getCertificates reverts for unknown applicant", async function () {
      await expect(
        applicantManager.getCertificates(other.address)
      ).to.be.revertedWithCustomError(applicantManager, "ApplicantNotFound");
    });

    it("getProjects reverts for unknown applicant", async function () {
      await expect(
        applicantManager.getProjects(other.address)
      ).to.be.revertedWithCustomError(applicantManager, "ApplicantNotFound");
    });
  });
});