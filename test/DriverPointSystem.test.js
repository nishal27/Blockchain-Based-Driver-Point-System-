const DriverPointSystem = artifacts.require("DriverPointSystem");

contract("DriverPointSystem", (accounts) => {
  let driverPointSystem;
  const owner = accounts[0];
  const driver1 = accounts[1];
  const driver2 = accounts[2];
  const nonOwner = accounts[3];
  const maxPoints = 12;

  beforeEach(async () => {
    driverPointSystem = await DriverPointSystem.new(maxPoints, { from: owner });
  });

  describe("Contract Deployment", () => {
    it("should set owner correctly", async () => {
      const contractOwner = await driverPointSystem.owner();
      assert.equal(contractOwner, owner, "Owner not set correctly");
    });

    it("should set max points correctly", async () => {
      const contractMaxPoints = await driverPointSystem.maxPoints();
      assert.equal(contractMaxPoints.toNumber(), maxPoints, "Max points not set correctly");
    });

    it("should initialize total violations to 0", async () => {
      const totalViolations = await driverPointSystem.totalViolations();
      assert.equal(totalViolations.toNumber(), 0, "Total violations should be 0");
    });
  });

  describe("Record Violation", () => {
    it("should record a violation successfully", async () => {
      const points = 3;
      const violationType = "Speeding";
      
      const tx = await driverPointSystem.recordViolation(
        driver1,
        points,
        violationType,
        { from: owner }
      );

      const driverPoints = await driverPointSystem.getDriverPoints(driver1);
      const violationCount = await driverPointSystem.getDriverViolationCount(driver1);
      const totalViolations = await driverPointSystem.totalViolations();

      assert.equal(driverPoints.toNumber(), points, "Driver points not recorded correctly");
      assert.equal(violationCount.toNumber(), 1, "Violation count not incremented");
      assert.equal(totalViolations.toNumber(), 1, "Total violations not incremented");

      assert.equal(tx.logs.length, 1, "Should emit one event");
      assert.equal(tx.logs[0].event, "ViolationRecorded", "Should emit ViolationRecorded event");
    });

    it("should prevent non-owner from recording violations", async () => {
      try {
        await driverPointSystem.recordViolation(
          driver1,
          3,
          "Speeding",
          { from: nonOwner }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Not authorized"), "Should throw authorization error");
      }
    });

    it("should prevent recording violation with zero points", async () => {
      try {
        await driverPointSystem.recordViolation(
          driver1,
          0,
          "Speeding",
          { from: owner }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Invalid points"), "Should throw invalid points error");
      }
    });

    it("should prevent recording violation exceeding max points", async () => {
      try {
        await driverPointSystem.recordViolation(
          driver1,
          maxPoints + 1,
          "Speeding",
          { from: owner }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Invalid points"), "Should throw invalid points error");
      }
    });

    it("should prevent recording violation that would exceed max points", async () => {
      await driverPointSystem.recordViolation(driver1, 10, "Speeding", { from: owner });
      
      try {
        await driverPointSystem.recordViolation(driver1, 5, "Reckless", { from: owner });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Exceeds max points"), "Should throw exceeds max points error");
      }
    });

    it("should emit DriverSuspended event when max points reached", async () => {
      const tx = await driverPointSystem.recordViolation(
        driver1,
        maxPoints,
        "Serious Violation",
        { from: owner }
      );

      const events = tx.logs.map(log => log.event);
      assert.include(events, "DriverSuspended", "Should emit DriverSuspended event");
    });

    it("should allow multiple violations for same driver", async () => {
      await driverPointSystem.recordViolation(driver1, 3, "Speeding", { from: owner });
      await driverPointSystem.recordViolation(driver1, 2, "Parking", { from: owner });

      const driverPoints = await driverPointSystem.getDriverPoints(driver1);
      const violationCount = await driverPointSystem.getDriverViolationCount(driver1);

      assert.equal(driverPoints.toNumber(), 5, "Should accumulate points correctly");
      assert.equal(violationCount.toNumber(), 2, "Should increment violation count");
    });
  });

  describe("Revoke Violation", () => {
    beforeEach(async () => {
      await driverPointSystem.recordViolation(driver1, 5, "Speeding", { from: owner });
    });

    it("should revoke a violation successfully", async () => {
      const tx = await driverPointSystem.revokeViolation(0, { from: owner });

      const driverPoints = await driverPointSystem.getDriverPoints(driver1);
      const violationCount = await driverPointSystem.getDriverViolationCount(driver1);
      const violation = await driverPointSystem.getViolation(0);

      assert.equal(driverPoints.toNumber(), 0, "Points should be deducted");
      assert.equal(violationCount.toNumber(), 0, "Violation count should decrease");
      assert.equal(violation.isRevoked, true, "Violation should be marked as revoked");

      assert.equal(tx.logs.length, 1, "Should emit one event");
      assert.equal(tx.logs[0].event, "PointsRevoked", "Should emit PointsRevoked event");
    });

    it("should prevent non-owner from revoking violations", async () => {
      try {
        await driverPointSystem.revokeViolation(0, { from: nonOwner });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Not authorized"), "Should throw authorization error");
      }
    });

    it("should prevent revoking invalid violation ID", async () => {
      try {
        await driverPointSystem.revokeViolation(999, { from: owner });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Invalid violation ID"), "Should throw invalid ID error");
      }
    });

    it("should prevent revoking already revoked violation", async () => {
      await driverPointSystem.revokeViolation(0, { from: owner });
      
      try {
        await driverPointSystem.revokeViolation(0, { from: owner });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Already revoked") || error.message.includes("Invalid state"), "Should throw already revoked error");
      }
    });

    it("should emit DriverReinstated event when points drop below max", async () => {
      await driverPointSystem.recordViolation(driver1, maxPoints, "Serious", { from: owner });
      const tx = await driverPointSystem.revokeViolation(0, { from: owner });

      const events = tx.logs.map(log => log.event);
      assert.include(events, "DriverReinstated", "Should emit DriverReinstated event");
    });
  });

  describe("Query Functions", () => {
    beforeEach(async () => {
      await driverPointSystem.recordViolation(driver1, 5, "Speeding", { from: owner });
      await driverPointSystem.recordViolation(driver1, 3, "Parking", { from: owner });
      await driverPointSystem.recordViolation(driver2, 2, "Red Light", { from: owner });
    });

    it("should return correct driver points", async () => {
      const points1 = await driverPointSystem.getDriverPoints(driver1);
      const points2 = await driverPointSystem.getDriverPoints(driver2);

      assert.equal(points1.toNumber(), 8, "Driver1 points incorrect");
      assert.equal(points2.toNumber(), 2, "Driver2 points incorrect");
    });

    it("should return correct violation count", async () => {
      const count1 = await driverPointSystem.getDriverViolationCount(driver1);
      const count2 = await driverPointSystem.getDriverViolationCount(driver2);

      assert.equal(count1.toNumber(), 2, "Driver1 violation count incorrect");
      assert.equal(count2.toNumber(), 1, "Driver2 violation count incorrect");
    });

    it("should return violation details correctly", async () => {
      const violation = await driverPointSystem.getViolation(0);

      assert.equal(violation.violationId.toNumber(), 0, "Violation ID incorrect");
      assert.equal(violation.driver, driver1, "Driver address incorrect");
      assert.equal(violation.points.toNumber(), 5, "Points incorrect");
      assert.equal(violation.violationType, "Speeding", "Violation type incorrect");
      assert.equal(violation.isRevoked, false, "Revoked status incorrect");
    });

    it("should return driver violation IDs", async () => {
      const violationIds = await driverPointSystem.getDriverViolationIds(driver1);
      
      assert.equal(violationIds.length, 2, "Should return 2 violation IDs");
      assert.equal(violationIds[0].toNumber(), 0, "First violation ID incorrect");
      assert.equal(violationIds[1].toNumber(), 1, "Second violation ID incorrect");
    });

    it("should return correct suspension status", async () => {
      const beforeSuspension = await driverPointSystem.isDriverSuspended(driver1);
      assert.equal(beforeSuspension, false, "Driver should not be suspended");

      await driverPointSystem.recordViolation(driver1, maxPoints, "Serious", { from: owner });
      const afterSuspension = await driverPointSystem.isDriverSuspended(driver1);
      assert.equal(afterSuspension, true, "Driver should be suspended");
    });
  });

  describe("Admin Functions", () => {
    it("should allow owner to update max points", async () => {
      const newMaxPoints = 15;
      await driverPointSystem.updateMaxPoints(newMaxPoints, { from: owner });
      
      const updatedMaxPoints = await driverPointSystem.maxPoints();
      assert.equal(updatedMaxPoints.toNumber(), newMaxPoints, "Max points not updated");
    });

    it("should prevent non-owner from updating max points", async () => {
      try {
        await driverPointSystem.updateMaxPoints(15, { from: nonOwner });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Not authorized"), "Should throw authorization error");
      }
    });

    it("should allow owner to transfer ownership", async () => {
      await driverPointSystem.transferOwnership(driver1, { from: owner });
      
      const newOwner = await driverPointSystem.owner();
      assert.equal(newOwner, driver1, "Ownership not transferred");
    });

    it("should prevent transferring to zero address", async () => {
      try {
        await driverPointSystem.transferOwnership("0x0000000000000000000000000000000000000000", { from: owner });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Invalid address"), "Should throw invalid address error");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero address validation", async () => {
      try {
        await driverPointSystem.recordViolation(
          "0x0000000000000000000000000000000000000000",
          3,
          "Speeding",
          { from: owner }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Invalid driver address"), "Should throw invalid address error");
      }
    });

    it("should handle multiple drivers correctly", async () => {
      await driverPointSystem.recordViolation(driver1, 3, "Speeding", { from: owner });
      await driverPointSystem.recordViolation(driver2, 5, "Reckless", { from: owner });

      const points1 = await driverPointSystem.getDriverPoints(driver1);
      const points2 = await driverPointSystem.getDriverPoints(driver2);

      assert.equal(points1.toNumber(), 3, "Driver1 points should be independent");
      assert.equal(points2.toNumber(), 5, "Driver2 points should be independent");
    });
  });
});

