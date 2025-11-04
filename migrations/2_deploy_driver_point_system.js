const DriverPointSystem = artifacts.require("DriverPointSystem");

module.exports = function (deployer) {
  const maxPoints = 12;
  deployer.deploy(DriverPointSystem, maxPoints);
};

