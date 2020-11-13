require('dotenv').config();

const HDWalletProvider = require('@truffle/hdwallet-provider');

const infuraProjectID = process.env.INFURA_PROJECT_ID;
const privateKey = process.env.PRIVATE_KEY_PROD;

module.exports = {
  networks: {
    mainnet: {
      provider: () => new HDWalletProvider(privateKey, `https://mainnet.infura.io/v3/${infuraProjectID}`),
      network_id: 1,
      gas: 5 * (10 ** 6),
      confirmations: 2,
      timeoutBlocks: 200,
      gasPrice: 80 * (10 ** 9),
      skipDryRun: true
    },
    ropsten: {
      provider: () => new HDWalletProvider(privateKey, `https://ropsten.infura.io/v3/${infuraProjectID}`),
      network_id: 3,
      gas: 10 ** 7,
      confirmations: 2,
      timeoutBlocks: 20,
      gasPrice: 20 ** 9, // 1 gwei
      skipDryRun: true
    },
    rinkeby: {
      provider: () => new HDWalletProvider(privateKey, `https://rinkeby.infura.io/v3/${infuraProjectID}`),
      network_id: 4,
      gas: 5 * (10 ** 6),
      confirmations: 2,
      timeoutBlocks: 20,
      gasPrice: 100 * (10 ** 9),
      skipDryRun: true
    },
    goerli: {
      provider: () => new HDWalletProvider(privateKey, `https://goerli.infura.io/v3/${infuraProjectID}`),
      network_id: 5,
      gas: 10 ** 7,
      confirmations: 2,
      timeoutBlocks: 20,
      gasPrice: 20 ** 9,
      skipDryRun: true
    },
    kovan: {
      provider: () => new HDWalletProvider(privateKey, `https://kovan.infura.io/v3/${infuraProjectID}`),
      network_id: 42,
      gas: 5 * (10 ** 6),
      confirmations: 2,
      timeoutBlocks: 20,
      gasPrice: 20 * (10 ** 9),
      skipDryRun: true
    }
  },

  compilers: {
    solc: {
      version: '0.6.7',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: 'istanbul'
      }
    }
  }
};