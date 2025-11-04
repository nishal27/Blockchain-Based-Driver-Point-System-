// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DriverPointSystem {
    address public owner;
    uint256 public totalViolations;
    uint256 public maxPoints;

    struct Violation {
        uint256 violationId;
        address driver;
        uint256 points;
        string violationType;
        uint256 timestamp;
        bool isRevoked;
    }

    struct Driver {
        uint256 totalPoints;
        uint256 violationCount;
        bool exists;
    }

    mapping(address => Driver) public drivers;
    mapping(uint256 => Violation) public violations;
    mapping(address => uint256[]) public driverViolations;

    event ViolationRecorded(
        uint256 indexed violationId,
        address indexed driver,
        uint256 points,
        string violationType,
        uint256 timestamp
    );

    event PointsRevoked(
        uint256 indexed violationId,
        address indexed driver,
        uint256 points
    );

    event DriverSuspended(address indexed driver);
    event DriverReinstated(address indexed driver);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier validDriver(address _driver) {
        require(_driver != address(0), "Invalid driver address");
        _;
    }

    modifier validPoints(uint256 _points) {
        require(_points > 0 && _points <= maxPoints, "Invalid points");
        _;
    }

    constructor(uint256 _maxPoints) {
        owner = msg.sender;
        maxPoints = _maxPoints;
    }

    function recordViolation(
        address _driver,
        uint256 _points,
        string memory _violationType
    ) external onlyOwner validDriver(_driver) validPoints(_points) {
        require(!violations[totalViolations].isRevoked, "Invalid state");
        
        if (!drivers[_driver].exists) {
            drivers[_driver] = Driver({
                totalPoints: 0,
                violationCount: 0,
                exists: true
            });
        }

        require(
            drivers[_driver].totalPoints + _points <= maxPoints,
            "Exceeds max points"
        );

        violations[totalViolations] = Violation({
            violationId: totalViolations,
            driver: _driver,
            points: _points,
            violationType: _violationType,
            timestamp: block.timestamp,
            isRevoked: false
        });

        drivers[_driver].totalPoints += _points;
        drivers[_driver].violationCount += 1;
        driverViolations[_driver].push(totalViolations);

        emit ViolationRecorded(
            totalViolations,
            _driver,
            _points,
            _violationType,
            block.timestamp
        );

        if (drivers[_driver].totalPoints >= maxPoints) {
            emit DriverSuspended(_driver);
        }

        totalViolations++;
    }

    function revokeViolation(uint256 _violationId) external onlyOwner {
        require(_violationId < totalViolations, "Invalid violation ID");
        Violation storage violation = violations[_violationId];
        require(!violation.isRevoked, "Already revoked");

        violation.isRevoked = true;
        drivers[violation.driver].totalPoints -= violation.points;
        drivers[violation.driver].violationCount -= 1;

        emit PointsRevoked(_violationId, violation.driver, violation.points);

        if (drivers[violation.driver].totalPoints < maxPoints) {
            emit DriverReinstated(violation.driver);
        }
    }

    function getDriverPoints(address _driver)
        external
        view
        validDriver(_driver)
        returns (uint256)
    {
        return drivers[_driver].totalPoints;
    }

    function getDriverViolationCount(address _driver)
        external
        view
        validDriver(_driver)
        returns (uint256)
    {
        return drivers[_driver].violationCount;
    }

    function getViolation(uint256 _violationId)
        external
        view
        returns (
            uint256 violationId,
            address driver,
            uint256 points,
            string memory violationType,
            uint256 timestamp,
            bool isRevoked
        )
    {
        require(_violationId < totalViolations, "Invalid violation ID");
        Violation memory v = violations[_violationId];
        return (
            v.violationId,
            v.driver,
            v.points,
            v.violationType,
            v.timestamp,
            v.isRevoked
        );
    }

    function getDriverViolationIds(address _driver)
        external
        view
        validDriver(_driver)
        returns (uint256[] memory)
    {
        return driverViolations[_driver];
    }

    function isDriverSuspended(address _driver)
        external
        view
        validDriver(_driver)
        returns (bool)
    {
        return drivers[_driver].totalPoints >= maxPoints;
    }

    function updateMaxPoints(uint256 _newMaxPoints) external onlyOwner {
        require(_newMaxPoints > 0, "Invalid max points");
        maxPoints = _newMaxPoints;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }
}

