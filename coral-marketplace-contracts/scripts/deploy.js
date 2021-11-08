// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `yarn hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile 
  // manually to make sure everything is compiled
  // await hre.run('compile');

  console.log('starting deployment...');

  const ownerAccount = await hre.reef.getSignerByName("mainnet-account");

  // Deploy NFTMarketplace
  const NFTMarketplace = await hre.reef.getContractFactory("CoralMarketplace", ownerAccount);
  const marketFee = 250; // 2.5%
  const nftMarketplace = await NFTMarketplace.deploy(marketFee);
  await nftMarketplace.deployed();
  console.log(`NFTMarketplace deployed in ${nftMarketplace.address}`);

  // Deploy NFT
  const NFT = await hre.reef.getContractFactory("CoralNFT", ownerAccount);
  const nft = await NFT.deploy(nftMarketplace.address);
  await nft.deployed();
  console.log(`NFT deployed to ${nft.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
