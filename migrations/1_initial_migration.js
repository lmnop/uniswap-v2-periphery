const UniswapV3Router01 = artifacts.require("./UniswapV3Router01.sol");

module.exports = function(deployer) {
  deployer.deploy(UniswapV3Router01, '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
};