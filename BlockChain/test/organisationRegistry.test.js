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

// Helper: generate a random bytes32 ID
const randomId = () => ethers.hexlify(ethers.randomBytes(32));

describe("OrganisationRegistry", function () {
  let registry;
  let owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const OrganisationRegistry = await ethers.getContractFactory("OrganisationRegistry");
    registry = await OrganisationRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("registerOrganisation", function () {
    it("registers an organisation with a bytes32 ID", async function () {
      const orgId = randomId();

      await expect(
        registry.connect(owner).registerOrganisation(orgId, OrganizationType.University)
      )
        .to.emit(registry, "OrganisationRegistered")
        .withArgs(orgId, OrganizationType.University);

      const record = await registry.organisations(orgId);
      expect(record.exists).to.equal(true);
      expect(record.isActive).to.equal(true);
      expect(record.organisationType).to.equal(OrganizationType.University);
    });

    it("reverts on zero bytes32 ID", async function () {
      await expect(
        registry.connect(owner).registerOrganisation(ethers.ZeroHash, OrganizationType.Company)
      ).to.be.revertedWithCustomError(registry, "InvalidOrganisationId");
    });

    it("reverts if already registered", async function () {
      const orgId = randomId();
      await registry.connect(owner).registerOrganisation(orgId, OrganizationType.Company);
      await expect(
        registry.connect(owner).registerOrganisation(orgId, OrganizationType.Company)
      ).to.be.revertedWithCustomError(registry, "OrganisationAlreadyRegistered");
    });

    it("reverts if called by non-owner", async function () {
      const orgId = randomId();
      await expect(
        registry.connect(other).registerOrganisation(orgId, OrganizationType.Company)
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });
  });

  describe("deactivateOrganisation / reactivateOrganisation", function () {
    let orgId;

    beforeEach(async function () {
      orgId = randomId();
      await registry.connect(owner).registerOrganisation(orgId, OrganizationType.Company);
    });

    it("deactivates an organisation", async function () {
      await expect(registry.connect(owner).deactivateOrganisation(orgId))
        .to.emit(registry, "OrganisationDeactivated")
        .withArgs(orgId);

      expect(await registry.isActiveOrganisation(orgId)).to.equal(false);
    });

    it("reverts deactivating an unknown organisation", async function () {
      const unknownId = randomId();
      await expect(
        registry.connect(owner).deactivateOrganisation(unknownId)
      ).to.be.revertedWithCustomError(registry, "OrganisationNotFound");
    });

    it("reactivates a deactivated organisation", async function () {
      await registry.connect(owner).deactivateOrganisation(orgId);

      await expect(registry.connect(owner).reactivateOrganisation(orgId))
        .to.emit(registry, "OrganisationReactivated")
        .withArgs(orgId);

      expect(await registry.isActiveOrganisation(orgId)).to.equal(true);
    });

    it("reverts deactivate/reactivate if called by non-owner", async function () {
      await expect(
        registry.connect(other).deactivateOrganisation(orgId)
      ).to.be.revertedWithCustomError(registry, "NotOwner");

      await expect(
        registry.connect(other).reactivateOrganisation(orgId)
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });
  });

  describe("isActiveOrganisation", function () {
    it("returns false for an unregistered bytes32 ID", async function () {
      const unknownId = randomId();
      expect(await registry.isActiveOrganisation(unknownId)).to.equal(false);
    });

    it("returns true for a registered and active organisation", async function () {
      const orgId = randomId();
      await registry.connect(owner).registerOrganisation(orgId, OrganizationType.NGO);
      expect(await registry.isActiveOrganisation(orgId)).to.equal(true);
    });
  });
});