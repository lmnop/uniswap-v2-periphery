const UniswapV3Router01 = artifacts.require("./UniswapV3Router01.sol");

module.exports = function(deployer) {
  deployer.deploy(UniswapV3Router01, '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', '0xc778417e063141139fce010982780140aa0cd5ab');
};