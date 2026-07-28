const { expect } = require("chai");
const { ethers } = require("hardhat");

const OrganizationType = {
  Company: 0,
  University: 1,
  ResearchLab: 2,
  NGO: 3,
  Government: 4,
  Other: 5,
};

const EmploymentType = {
  Internship: 0,
  Employment: 1,
};

const RequestStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Cancelled: 3,
};

describe("EmploymentManager", function () {
  let applicantManager, organisationRegistry, employmentManager;
  let owner, org, student, other;

  const employmentHash = ethers.keccak256(ethers.toUtf8Bytes("job-1"));

  async function futureTimestamp(offsetSeconds = 3600) {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp + offsetSeconds;
  }

  beforeEach(async function () {
    [owner, org, student, other] = await ethers.getSigners();

    const ApplicantManager = await ethers.getContractFactory("ApplicantManager");
    applicantManager = await ApplicantManager.deploy();
    await applicantManager.waitForDeployment();

    const OrganisationRegistry = await ethers.getContractFactory("OrganisationRegistry");
    organisationRegistry = await OrganisationRegistry.deploy();
    await organisationRegistry.waitForDeployment();

    const EmploymentManager = await ethers.getContractFactory("EmploymentManager");
    employmentManager = await EmploymentManager.deploy(
      await applicantManager.getAddress(),
      await organisationRegistry.getAddress()
    );
    await employmentManager.waitForDeployment();

    await applicantManager.connect(owner).setEmploymentManager(await employmentManager.getAddress());
    await organisationRegistry.connect(owner).registerOrganisation(org.address, OrganizationType.Company);
    await applicantManager.connect(student).createApplicant();
  });

  describe("createOffer", function () {
    it("creates an offer", async function () {
      const deadline = await futureTimestamp();

      await expect(
        employmentManager
          .connect(org)
          .createOffer(employmentHash, EmploymentType.Internship, student.address, deadline)
      )
        .to.emit(employmentManager, "OfferCreated")
        .withArgs(1, org.address, student.address);

      const offer = await employmentManager.offers(1);
      expect(offer.organisation).to.equal(org.address);
      expect(offer.student).to.equal(student.address);
      expect(offer.status).to.equal(RequestStatus.Pending);
      expect(offer.active).to.equal(false);

      expect(
        await employmentManager.activeOffers(employmentHash, org.address, student.address)
      ).to.equal(1);
    });

    it("reverts if the caller isn't a registered/active organisation", async function () {
      await expect(
        employmentManager
          .connect(other)
          .createOffer(employmentHash, EmploymentType.Internship, student.address, 0)
      ).to.be.revertedWithCustomError(employmentManager, "InvalidOrganisation");
    });

    it("reverts if the organisation was deactivated", async function () {
      await organisationRegistry.connect(owner).deactivateOrganisation(org.address);
      await expect(
        employmentManager
          .connect(org)
          .createOffer(employmentHash, EmploymentType.Internship, student.address, 0)
      ).to.be.revertedWithCustomError(employmentManager, "InvalidOrganisation");
    });

    it("reverts on a past deadline", async function () {
      const past = (await ethers.provider.getBlock("latest")).timestamp - 1000;
      await expect(
        employmentManager
          .connect(org)
          .createOffer(employmentHash, EmploymentType.Internship, student.address, past)
      ).to.be.revertedWithCustomError(employmentManager, "InvalidExpiry");
    });

    it("allows deadline = 0 (no deadline)", async function () {
      await expect(
        employmentManager
          .connect(org)
          .createOffer(employmentHash, EmploymentType.Internship, student.address, 0)
      ).to.emit(employmentManager, "OfferCreated");
    });

    it("reverts if an identical active offer already exists", async function () {
      await employmentManager
        .connect(org)
        .createOffer(employmentHash, EmploymentType.Internship, student.address, 0);

      await expect(
        employmentManager
          .connect(org)
          .createOffer(employmentHash, EmploymentType.Internship, student.address, 0)
      ).to.be.revertedWithCustomError(employmentManager, "OfferAlreadyExists");
    });

    it("tracks offers per organisation and per student", async function () {
      await employmentManager
        .connect(org)
        .createOffer(employmentHash, EmploymentType.Internship, student.address, 0);

      expect(await employmentManager.connect(org).getOrganisationOffers()).to.deep.equal([1n]);
      expect(await employmentManager.connect(student).getStudentOffers()).to.deep.equal([1n]);
    });
  });

  describe("acceptOffer", function () {
    beforeEach(async function () {
      await employmentManager
        .connect(org)
        .createOffer(employmentHash, EmploymentType.Internship, student.address, 0);
    });

    it("reverts if called by someone other than the offered student", async function () {
      await expect(
        employmentManager.connect(other).acceptOffer(1)
      ).to.be.revertedWithCustomError(employmentManager, "UnauthorizedStudent");
    });

    it("reverts for an unknown offer id", async function () {
      await expect(
        employmentManager.connect(student).acceptOffer(999)
      ).to.be.revertedWithCustomError(employmentManager, "OfferNotFound");
    });

    it("accepts the offer, records employment, marks active, clears activeOffers slot", async function () {
      await expect(employmentManager.connect(student).acceptOffer(1))
        .to.emit(employmentManager, "OfferAccepted")
        .withArgs(1);

      const offer = await employmentManager.offers(1);
      expect(offer.status).to.equal(RequestStatus.Approved);
      expect(offer.active).to.equal(true);

      expect(
        await employmentManager.activeOffers(employmentHash, org.address, student.address)
      ).to.equal(0);

      const employment = await applicantManager.employments(employmentHash);
      expect(employment.exists).to.equal(true);
      expect(employment.organisation).to.equal(org.address);
      expect(employment.endedAt).to.equal(0);

      const employments = await applicantManager.getEmployments(student.address);
      expect(employments).to.deep.equal([employmentHash]);
    });

    it("reverts if accepted twice", async function () {
      await employmentManager.connect(student).acceptOffer(1);
      await expect(
        employmentManager.connect(student).acceptOffer(1)
      ).to.be.revertedWithCustomError(employmentManager, "OfferAlreadyProcessed");
    });
  });

  describe("rejectOffer", function () {
    beforeEach(async function () {
      await employmentManager
        .connect(org)
        .createOffer(employmentHash, EmploymentType.Internship, student.address, 0);
    });

    it("reverts if called by someone other than the offered student", async function () {
      await expect(
        employmentManager.connect(other).rejectOffer(1)
      ).to.be.revertedWithCustomError(employmentManager, "UnauthorizedStudent");
    });

    it("rejects the offer and clears the active slot without creating an employment record", async function () {
      await expect(employmentManager.connect(student).rejectOffer(1))
        .to.emit(employmentManager, "OfferRejected")
        .withArgs(1);

      const offer = await employmentManager.offers(1);
      expect(offer.status).to.equal(RequestStatus.Rejected);
      expect(offer.active).to.equal(false);

      expect(
        await employmentManager.activeOffers(employmentHash, org.address, student.address)
      ).to.equal(0);

      const employment = await applicantManager.employments(employmentHash);
      expect(employment.exists).to.equal(false);
    });

    it("reverts if the offer was already processed", async function () {
      await employmentManager.connect(student).rejectOffer(1);
      await expect(
        employmentManager.connect(student).rejectOffer(1)
      ).to.be.revertedWithCustomError(employmentManager, "OfferAlreadyProcessed");
    });

    it("allows a new offer for the same hash/org/student after rejection clears the slot", async function () {
      await employmentManager.connect(student).rejectOffer(1);
      await expect(
        employmentManager
          .connect(org)
          .createOffer(employmentHash, EmploymentType.Internship, student.address, 0)
      ).to.emit(employmentManager, "OfferCreated");
    });
  });

  describe("endEmployment", function () {
    beforeEach(async function () {
      await employmentManager
        .connect(org)
        .createOffer(employmentHash, EmploymentType.Internship, student.address, 0);
      await employmentManager.connect(student).acceptOffer(1);
    });

    it("reverts if called by someone other than the offering organisation", async function () {
      await expect(
        employmentManager.connect(other).endEmployment(1)
      ).to.be.revertedWithCustomError(employmentManager, "UnauthorizedOrganisation");
    });

    it("reverts for an unknown offer id", async function () {
      await expect(
        employmentManager.connect(org).endEmployment(999)
      ).to.be.revertedWithCustomError(employmentManager, "OfferNotFound");
    });

    it("ends the employment", async function () {
      await expect(employmentManager.connect(org).endEmployment(1))
        .to.emit(employmentManager, "EmploymentEnded")
        .withArgs(1);

      expect(await employmentManager.isCurrentlyActive(1)).to.equal(false);

      const employment = await applicantManager.employments(employmentHash);
      expect(employment.endedAt).to.not.equal(0);

      expect(await applicantManager.isEmploymentActive(employmentHash)).to.equal(false);
    });

    it("reverts if the employment was never active (offer still pending / rejected)", async function () {
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("job-2"));
      await employmentManager
        .connect(org)
        .createOffer(hash2, EmploymentType.Internship, student.address, 0);
      // offer 2 is still Pending, never accepted -> never active

      await expect(
        employmentManager.connect(org).endEmployment(2)
      ).to.be.revertedWithCustomError(employmentManager, "EmploymentNotActive");
    });

    it("reverts if ended twice", async function () {
      await employmentManager.connect(org).endEmployment(1);
      await expect(
        employmentManager.connect(org).endEmployment(1)
      ).to.be.revertedWithCustomError(employmentManager, "EmploymentNotActive");
    });
  });

  describe("onlyEmploymentManager gate on ApplicantManager", function () {
    it("ApplicantManager rejects addEmployment/endEmployment calls from anyone but EmploymentManager", async function () {
      await expect(
        applicantManager
          .connect(org)
          .addEmployment(student.address, employmentHash, EmploymentType.Internship, org.address)
      ).to.be.revertedWithCustomError(applicantManager, "UnauthorisedOperation");

      await expect(
        applicantManager.connect(org).endEmployment(employmentHash)
      ).to.be.revertedWithCustomError(applicantManager, "UnauthorisedOperation");
    });
  });

  describe("end-to-end integration", function () {
    it("full lifecycle: offer -> accept -> employment recorded -> end -> reflected as inactive", async function () {
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("job-2"));

      // offer 1: accepted
      await employmentManager
        .connect(org)
        .createOffer(employmentHash, EmploymentType.Internship, student.address, 0);
      await employmentManager.connect(student).acceptOffer(1);

      // offer 2: rejected
      await employmentManager
        .connect(org)
        .createOffer(hash2, EmploymentType.Employment, student.address, 0);
      await employmentManager.connect(student).rejectOffer(2);

      const employments = await applicantManager.getEmployments(student.address);
      expect(employments).to.deep.equal([employmentHash]);

      await employmentManager.connect(org).endEmployment(1);
      expect(await applicantManager.isEmploymentActive(employmentHash)).to.equal(false);
    });
  });
});