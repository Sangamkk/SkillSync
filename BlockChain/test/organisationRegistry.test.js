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

describe("OrganisationRegistry", function () {
  let registry;
  let owner, org, other;

  beforeEach(async function () {
    [owner, org, other] = await ethers.getSigners();
    const OrganisationRegistry = await ethers.getContractFactory("OrganisationRegistry");
    registry = await OrganisationRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("registerOrganisation", function () {
    it("registers an organisation", async function () {
      await expect(
        registry.connect(owner).registerOrganisation(org.address, OrganizationType.University)
      )
        .to.emit(registry, "OrganisationRegistered")
        .withArgs(org.address, OrganizationType.University);

      const record = await registry.organisations(org.address);
      expect(record.exists).to.equal(true);
      expect(record.isActive).to.equal(true);
      expect(record.organisationType).to.equal(OrganizationType.University);
    });

    it("reverts on zero address", async function () {
      await expect(
        registry.connect(owner).registerOrganisation(ethers.ZeroAddress, OrganizationType.Company)
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });

    it("reverts if already registered", async function () {
      await registry.connect(owner).registerOrganisation(org.address, OrganizationType.Company);
      await expect(
        registry.connect(owner).registerOrganisation(org.address, OrganizationType.Company)
      ).to.be.revertedWithCustomError(registry, "OrganisationAlreadyRegistered");
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        registry.connect(other).registerOrganisation(org.address, OrganizationType.Company)
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });
  });

  describe("deactivateOrganisation / reactivateOrganisation", function () {
    beforeEach(async function () {
      await registry.connect(owner).registerOrganisation(org.address, OrganizationType.Company);
    });

    it("deactivates", async function () {
      await expect(registry.connect(owner).deactivateOrganisation(org.address))
        .to.emit(registry, "OrganisationDeactivated")
        .withArgs(org.address);

      expect(await registry.isActiveOrganisation(org.address)).to.equal(false);
    });

    it("reverts deactivating an unknown organisation", async function () {
      await expect(
        registry.connect(owner).deactivateOrganisation(other.address)
      ).to.be.revertedWithCustomError(registry, "OrganisationNotFound");
    });

    it("reactivates", async function () {
      await registry.connect(owner).deactivateOrganisation(org.address);

      await expect(registry.connect(owner).reactivateOrganisation(org.address))
        .to.emit(registry, "OrganisationReactivated")
        .withArgs(org.address);

      expect(await registry.isActiveOrganisation(org.address)).to.equal(true);
    });

    it("reverts reactivate/deactivate if called by non-owner", async function () {
      await expect(
        registry.connect(other).deactivateOrganisation(org.address)
      ).to.be.revertedWithCustomError(registry, "NotOwner");

      await expect(
        registry.connect(other).reactivateOrganisation(org.address)
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });
  });

  describe("isActiveOrganisation", function () {
    it("returns false for an unregistered address", async function () {
      expect(await registry.isActiveOrganisation(other.address)).to.equal(false);
    });
  });
});