require("@reef-defi/hardhat-reef");

const SEEDS = require("./seeds.json")

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.0",
  defaultNetwork: "reef_testnet",
  networks: {
    reef_local: {
      url: "ws://127.0.0.1:9944",
      seeds: {
        "account1": SEEDS.account1,
        "account2": SEEDS.account2,
        "account3": SEEDS.account3,
        "account4": SEEDS.account4,
        "account5": SEEDS.account5
      }
    },
    reef_testnet: {
      url: "wss://rpc-testnet.reefscan.com/ws",
      seeds: {
        "account1": SEEDS.account1,
        "account2": SEEDS.account2,
        "account3": SEEDS.account3,
        "account4": SEEDS.account4,
        "account5": SEEDS.account5
      }
    },
    reef_mainnet: {
      url: "wss://rpc.reefscan.com/ws",
      seeds: {
        "mainnet-account": SEEDS["mainnet-account"]
      }
    }
  },
  mocha: {
    timeout: 100000
  }
};
