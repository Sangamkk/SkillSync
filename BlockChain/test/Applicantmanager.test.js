const { expect } = require("chai");
const { ethers } = require("hardhat");

// Types.CredentialType enum: Certificate=0, Project=1, Internship=2, Hackathon=3, ResearchPaper=4, Patent=5
const CredentialType = {
  Certificate: 0,
  Project: 1,
  Internship: 2,
  Hackathon: 3,
  ResearchPaper: 4,
  Patent: 5,
};

// Helper: generate a random bytes32 ID
const randomId = () => ethers.hexlify(ethers.randomBytes(32));

describe("ApplicantManager", function () {
  let applicantManager;
  let owner, requestManagerSigner, other;

  const applicantId = randomId();
  const orgId = randomId();
  const certHash = ethers.keccak256(ethers.toUtf8Bytes("cert-1"));
  const projectHash = ethers.keccak256(ethers.toUtf8Bytes("project-1"));
  const employmentHash = ethers.keccak256(ethers.toUtf8Bytes("employment-1"));

  beforeEach(async function () {
    [owner, requestManagerSigner, other] = await ethers.getSigners();

    const ApplicantManager = await ethers.getContractFactory("ApplicantManager");
    applicantManager = await ApplicantManager.deploy();
    await applicantManager.waitForDeployment();

    // Wire up requestManager so onlyAuthorizedCaller-gated functions can be tested
    await applicantManager.connect(owner).setRequestManager(requestManagerSigner.address);
  });

  describe("setRequestManager", function () {
    it("lets the owner set requestManager once", async function () {
      expect(await applicantManager.requestManager()).to.equal(requestManagerSigner.address);
    });

    it("reverts on a second call (already set)", async function () {
      await expect(
        applicantManager.connect(owner).setRequestManager(other.address)
      ).to.be.revertedWithCustomError(applicantManager, "RequestManagerAlreadySet");
    });

    it("reverts if called by a non-owner", async function () {
      const ApplicantManager = await ethers.getContractFactory("ApplicantManager");
      const fresh = await ApplicantManager.deploy();
      await fresh.waitForDeployment();
      await expect(
        fresh.connect(other).setRequestManager(other.address)
      ).to.be.revertedWithCustomError(fresh, "NotOwner");
    });
  });

  describe("createApplicant", function () {
    it("creates an applicant with bytes32 ID (called by owner)", async function () {
      const id = randomId();
      await expect(applicantManager.connect(owner).createApplicant(id))
        .to.emit(applicantManager, "ApplicantCreated")
        .withArgs(id);

      expect(await applicantManager.applicantExists(id)).to.equal(true);
    });

    it("creates an applicant via authorized caller (requestManager)", async function () {
      const id = randomId();
      await expect(
        applicantManager.connect(requestManagerSigner).createApplicant(id)
      )
        .to.emit(applicantManager, "ApplicantCreated")
        .withArgs(id);
    });

    it("reverts if applicantId is zero bytes32", async function () {
      await expect(
        applicantManager.connect(owner).createApplicant(ethers.ZeroHash)
      ).to.be.revertedWithCustomError(applicantManager, "InvalidApplicantId");
    });

    it("reverts if called by an unauthorized address", async function () {
      await expect(
        applicantManager.connect(other).createApplicant(randomId())
      ).to.be.revertedWithCustomError(applicantManager, "NotOwner");
    });

    it("reverts if the applicant ID already exists", async function () {
      const id = randomId();
      await applicantManager.connect(owner).createApplicant(id);
      await expect(
        applicantManager.connect(owner).createApplicant(id)
      ).to.be.revertedWithCustomError(applicantManager, "ApplicantAlreadyExists");
    });
  });

  describe("addCertificate", function () {
    beforeEach(async function () {
      await applicantManager.connect(owner).createApplicant(applicantId);
    });

    it("reverts if not called by authorized caller", async function () {
      await expect(
        applicantManager
          .connect(other)
          .addCertificate(applicantId, orgId, certHash, CredentialType.Certificate, 0)
      ).to.be.revertedWithCustomError(applicantManager, "NotOwner");
    });

    it("reverts if the applicant doesn't exist", async function () {
      const unknownApplicant = randomId();
      await expect(
        applicantManager
          .connect(requestManagerSigner)
          .addCertificate(unknownApplicant, orgId, certHash, CredentialType.Certificate, 0)
      ).to.be.revertedWithCustomError(applicantManager, "ApplicantNotFound");
    });

    it("reverts on CredentialType.Project", async function () {
      await expect(
        applicantManager
          .connect(requestManagerSigner)
          .addCertificate(applicantId, orgId, certHash, CredentialType.Project, 0)
      ).to.be.revertedWithCustomError(applicantManager, "InvalidCredentialType");
    });

    it("reverts on an expiry in the past", async function () {
      const past = (await ethers.provider.getBlock("latest")).timestamp - 1000;
      await expect(
        applicantManager
          .connect(requestManagerSigner)
          .addCertificate(applicantId, orgId, certHash, CredentialType.Certificate, past)
      ).to.be.revertedWithCustomError(applicantManager, "InvalidExpiry");
    });

    it("adds a certificate with expiresAt = 0 (no expiry)", async function () {
      await expect(
        applicantManager
          .connect(requestManagerSigner)
          .addCertificate(applicantId, orgId, certHash, CredentialType.Certificate, 0)
      )
        .to.emit(applicantManager, "CertificateAdded")
        .withArgs(applicantId, orgId, certHash);

      const cert = await applicantManager.certificates(certHash);
      expect(cert.certificateHash).to.equal(certHash);
      expect(cert.organisationId).to.equal(orgId);
      expect(cert.revoked).to.equal(false);

      const certs = await applicantManager.getCertificates(applicantId);
      expect(certs).to.deep.equal([certHash]);
    });

    it("reverts if the certificate hash already exists", async function () {
      await applicantManager
        .connect(requestManagerSigner)
        .addCertificate(applicantId, orgId, certHash, CredentialType.Certificate, 0);

      await expect(
        applicantManager
          .connect(requestManagerSigner)
          .addCertificate(applicantId, orgId, certHash, CredentialType.Certificate, 0)
      ).to.be.revertedWithCustomError(applicantManager, "CertificateAlreadyExists");
    });
  });

  describe("revokeCertificate", function () {
    beforeEach(async function () {
      await applicantManager.connect(owner).createApplicant(applicantId);
      await applicantManager
        .connect(requestManagerSigner)
        .addCertificate(applicantId, orgId, certHash, CredentialType.Certificate, 0);
    });

    it("reverts if not called by authorized caller", async function () {
      await expect(
        applicantManager.connect(other).revokeCertificate(certHash)
      ).to.be.revertedWithCustomError(applicantManager, "NotOwner");
    });

    it("reverts for an unknown certificate", async function () {
      const unknown = ethers.keccak256(ethers.toUtf8Bytes("nope"));
      await expect(
        applicantManager.connect(requestManagerSigner).revokeCertificate(unknown)
      ).to.be.revertedWithCustomError(applicantManager, "CertificateNotFound");
    });

    it("revokes a certificate", async function () {
      await expect(
        applicantManager.connect(requestManagerSigner).revokeCertificate(certHash)
      )
        .to.emit(applicantManager, "CertificateRevoked")
        .withArgs(certHash);

      const cert = await applicantManager.certificates(certHash);
      expect(cert.revoked).to.equal(true);
    });

    it("reverts if already revoked", async function () {
      await applicantManager.connect(requestManagerSigner).revokeCertificate(certHash);
      await expect(
        applicantManager.connect(requestManagerSigner).revokeCertificate(certHash)
      ).to.be.revertedWithCustomError(applicantManager, "CertificateAlreadyRevoked");
    });
  });

  describe("addProject", function () {
    beforeEach(async function () {
      await applicantManager.connect(owner).createApplicant(applicantId);
    });

    it("reverts if not called by authorized caller", async function () {
      await expect(
        applicantManager.connect(other).addProject(applicantId, projectHash)
      ).to.be.revertedWithCustomError(applicantManager, "NotOwner");
    });

    it("reverts if applicant doesn't exist", async function () {
      const unknownId = randomId();
      await expect(
        applicantManager.connect(owner).addProject(unknownId, projectHash)
      ).to.be.revertedWithCustomError(applicantManager, "ApplicantNotFound");
    });

    it("adds a project via authorized caller", async function () {
      await expect(
        applicantManager.connect(requestManagerSigner).addProject(applicantId, projectHash)
      )
        .to.emit(applicantManager, "Projectadded")
        .withArgs(applicantId, projectHash);

      const project = await applicantManager.projects(projectHash);
      expect(project.exists).to.equal(true);
      expect(project.applicantId).to.equal(applicantId);

      const projects = await applicantManager.getProjects(applicantId);
      expect(projects).to.deep.equal([projectHash]);
    });

    it("reverts if the project already exists", async function () {
      await applicantManager.connect(requestManagerSigner).addProject(applicantId, projectHash);
      await expect(
        applicantManager.connect(requestManagerSigner).addProject(applicantId, projectHash)
      ).to.be.revertedWithCustomError(applicantManager, "ProjectAlreadyExists");
    });
  });

  describe("addProjectVerification / revokeProjectVerification", function () {
    beforeEach(async function () {
      await applicantManager.connect(owner).createApplicant(applicantId);
      await applicantManager
        .connect(requestManagerSigner)
        .addProject(applicantId, projectHash);
    });

    it("reverts if not called by authorized caller", async function () {
      await expect(
        applicantManager.connect(other).addProjectVerification(projectHash, orgId)
      ).to.be.revertedWithCustomError(applicantManager, "NotOwner");
    });

    it("reverts for an unknown project", async function () {
      const unknown = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      await expect(
        applicantManager
          .connect(requestManagerSigner)
          .addProjectVerification(unknown, orgId)
      ).to.be.revertedWithCustomError(applicantManager, "ProjectNotFound");
    });

    it("adds a verification and marks project verified", async function () {
      await expect(
        applicantManager
          .connect(requestManagerSigner)
          .addProjectVerification(projectHash, orgId)
      )
        .to.emit(applicantManager, "Projectverified")
        .withArgs(orgId, projectHash);

      expect(await applicantManager.isProjectVerified(projectHash)).to.equal(true);

      const verifications = await applicantManager.getProjectVerifications(projectHash);
      expect(verifications.length).to.equal(1);
      expect(verifications[0].verifierId).to.equal(orgId);
      expect(verifications[0].revoked).to.equal(false);
    });

    it("reverts if the same verifier verifies twice while active", async function () {
      await applicantManager
        .connect(requestManagerSigner)
        .addProjectVerification(projectHash, orgId);
      await expect(
        applicantManager
          .connect(requestManagerSigner)
          .addProjectVerification(projectHash, orgId)
      ).to.be.revertedWithCustomError(applicantManager, "AlreadyVerifiedByIssuer");
    });

    it("allows a different verifier to verify the same project", async function () {
      const orgId2 = randomId();
      await applicantManager
        .connect(requestManagerSigner)
        .addProjectVerification(projectHash, orgId);
      await applicantManager
        .connect(requestManagerSigner)
        .addProjectVerification(projectHash, orgId2);

      const verifications = await applicantManager.getProjectVerifications(projectHash);
      expect(verifications.length).to.equal(2);
    });

    it("revokes a verification", async function () {
      await applicantManager
        .connect(requestManagerSigner)
        .addProjectVerification(projectHash, orgId);

      await expect(
        applicantManager
          .connect(requestManagerSigner)
          .revokeProjectVerification(projectHash, orgId)
      )
        .to.emit(applicantManager, "ProjectVerificationRevoked")
        .withArgs(orgId, projectHash);

      expect(await applicantManager.isProjectVerified(projectHash)).to.equal(false);
    });

    it("reverts revoking a verification that was never made", async function () {
      await expect(
        applicantManager
          .connect(requestManagerSigner)
          .revokeProjectVerification(projectHash, orgId)
      ).to.be.revertedWithCustomError(applicantManager, "VerificationNotFound");
    });
  });

  describe("addEmployment / endEmployment", function () {
    beforeEach(async function () {
      await applicantManager.connect(owner).createApplicant(applicantId);
    });

    it("adds employment", async function () {
      // EmploymentType: Internship=0, Employment=1
      await expect(
        applicantManager
          .connect(requestManagerSigner)
          .addEmployment(applicantId, employmentHash, 1, orgId)
      )
        .to.emit(applicantManager, "EmploymentAdded")
        .withArgs(applicantId, orgId, employmentHash);

      const rec = await applicantManager.employments(employmentHash);
      expect(rec.exists).to.equal(true);
      expect(rec.applicantId).to.equal(applicantId);
      expect(rec.organisationId).to.equal(orgId);
    });

    it("ends employment", async function () {
      await applicantManager
        .connect(requestManagerSigner)
        .addEmployment(applicantId, employmentHash, 1, orgId);

      await expect(
        applicantManager.connect(requestManagerSigner).endEmployment(employmentHash)
      )
        .to.emit(applicantManager, "EmploymentTerminated")
        .withArgs(employmentHash, orgId);

      expect(await applicantManager.isEmploymentActive(employmentHash)).to.equal(false);
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
        applicantManager.getCertificates(randomId())
      ).to.be.revertedWithCustomError(applicantManager, "ApplicantNotFound");
    });

    it("getProjects reverts for unknown applicant", async function () {
      await expect(
        applicantManager.getProjects(randomId())
      ).to.be.revertedWithCustomError(applicantManager, "ApplicantNotFound");
    });
  });
});