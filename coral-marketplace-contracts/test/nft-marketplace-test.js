const { expect } = require('chai');
const hre = require('hardhat');
const ReefAbi = require('./ReefToken.json')

describe('Coral NFT marketplace', ()  => {
  let market, nft, owner, seller, artist, buyer1, buyer2, marketFee, marketContractAddress, 
    nftContractAddress, salePrice, ownerAddress, sellerAddress, artistAddress, buyer1Address, 
    buyer2Address, reefToken, token1Id, token2Id, item1Id, royaltyValue, maxGasFee;

  before(async () => {
    // Deployed contract addresses (comment to avoid deploying new contracts)
    marketContractAddress = '0xA3d64F64b62CE22678D034745536814Db1557303';
    nftContractAddress = '0x808d66b3fEFB94Fe8A0c92cc8BaBE99bA5341E4b';

    // Get accounts
    owner = await hre.reef.getSignerByName('account1');
    seller = await hre.reef.getSignerByName('account2');
    buyer1 = await hre.reef.getSignerByName('account3');
    buyer2 = await hre.reef.getSignerByName('account4');
    artist = await hre.reef.getSignerByName('account5');

    // Get accounts addresses
    ownerAddress = await owner.getAddress();
    sellerAddress = await seller.getAddress();
    buyer1Address = await buyer1.getAddress();
    buyer2Address = await buyer2.getAddress();
    artistAddress = await artist.getAddress();

    // Initialize and connect to Reef token
    const reefTokenAddress = '0x0000000000000000000000000000000001000000';
    const ReefToken = new ethers.Contract(reefTokenAddress, ReefAbi, owner);
    reefToken = ReefToken.connect(owner);

    marketFee = 350; // 3.5%
    maxGasFee = ethers.utils.parseUnits('5', 'ether');
    
    if (!marketContractAddress) {
      // Deploy CoralMarketplace contract
      console.log('\tdeploying Market contract...');
      await getBalance(ownerAddress, 'owner');
      const Market = await hre.reef.getContractFactory('CoralMarketplace', owner);
      market = await Market.deploy(marketFee);
      await market.deployed();
      marketContractAddress = market.address;
      await getBalance(ownerAddress, 'owner');
    } else {
      // Get deployed contract
      const Market = await hre.reef.getContractFactory('CoralMarketplace', owner);
      market = await Market.attach(marketContractAddress);
    }
    console.log(`\tMarket contract deployed in ${marketContractAddress}`);
    
    if (!nftContractAddress) {
      // Deploy CoralNFT contract
      console.log('\tdeploying NFT contract...');
      await getBalance(ownerAddress, 'owner');
      const NFT = await hre.reef.getContractFactory('CoralNFT', owner);
      nft = await NFT.deploy(marketContractAddress);
      await nft.deployed();
      nftContractAddress = nft.address;
      await getBalance(ownerAddress, 'owner');
    } else {
      // Get deployed contract
      const NFT = await hre.reef.getContractFactory('CoralNFT', owner);
      nft = await NFT.attach(nftContractAddress);
    }
    console.log(`\tNFT contact deployed ${nftContractAddress}`);
  });


  it('Should get NFT contract data', async () => {
    expect(await nft.name()).to.equal('Coral NFT');
    const interfaceIdErc2981 = '0x2a55205a';
    const supportsErc2981 = await nft.supportsInterface(interfaceIdErc2981);
    expect(supportsErc2981).to.equal(true);
  });


  it('Should allow change market fee to owner', async () => {
    let marketWithSigner = market.connect(owner);
    await marketWithSigner.setMarketFee(250);
    let fetchedMarketFee = await marketWithSigner.getMarketFee();
    expect(Number(fetchedMarketFee)).to.equal(Number(250));
    marketFee = 250;
  });


  it('Should create NFTs', async () => {
    salePrice = ethers.utils.parseUnits('50', 'ether'); // 50 REEF
    royaltyValue = 1000; // 10%

    const nftWithSigner = nft.connect(seller);

    // Create NFTs
    console.log('\tseller creating NFTs...');
    await getBalance(sellerAddress, 'seller');
    const tx1 = await nftWithSigner.createToken('https://fake-uri-1.com', artistAddress, royaltyValue);
    const receipt1 = await tx1.wait();
		token1Id = receipt1.events[0].args[2].toNumber();
    const tx2 = await nftWithSigner.createToken('https://fake-uri-2.com', artistAddress, royaltyValue);
    const receipt2 = await tx2.wait();
		token2Id = receipt2.events[0].args[2].toNumber();
    console.log(`\tNFTs created with tokenIds ${token1Id} and ${token2Id}`);
    await getBalance(sellerAddress, 'seller');

    // Get royalty info
    const royaltyInfo = await nftWithSigner.royaltyInfo(token1Id, salePrice);

    // Evaluate results
    expect(royaltyInfo.receiver).to.equal(artistAddress);
    expect(Number(royaltyInfo.royaltyAmount)).to.equal(salePrice * royaltyValue / 10000);
  });


  it('Should get created NFTs', async () => {
    const marketWithSigner = market.connect(seller);

    // Get items created by seller
    console.log('\tgetting seller creations...');
    const items = await marketWithSigner.fetchItemsCreated();
    console.log('\tNFT sales created');
    console.log(items);

    // Evaluate results
    expect(items[0].creator).to.equal(sellerAddress);
  });


  it.skip('Should put NFTs for sale', async () => {
    const marketWithSigner = market.connect(seller);

    const iniItems = await market.fetchMarketItems();

    // Put NFT for sale
    console.log('\tseller creating NFT sales...');
    await getBalance(sellerAddress, 'seller');
    const iniTokenOwner = await nft.ownerOf(token1Id);
    await marketWithSigner.createMarketItem(nftContractAddress, token1Id, salePrice);
    await marketWithSigner.createMarketItem(nftContractAddress, token2Id, salePrice);
    console.log('\tNFT sales created');
    await getBalance(sellerAddress, 'seller');

    // Get items info
    const items = await market.fetchMarketItems();
    const item1 = items[items.length - 2];
    const item1Uri = await nft.tokenURI(item1.tokenId);
    const endTokenOwner = await nft.ownerOf(token1Id);
    item1Id = Number(item1.itemId);
      
    // Evaluate results
    expect(iniTokenOwner).to.equal(sellerAddress);
    expect(endTokenOwner).to.equal(marketContractAddress);

    expect(items.length).to.equal(iniItems.length + 2);
    expect(item1Uri).to.equal('https://fake-uri-1.com');
    expect(item1.nftContract).to.equal(nftContractAddress);
    expect(Number(item1.tokenId)).to.equal(token1Id);
    expect(item1.seller).to.equal(sellerAddress);
    expect(parseInt(item1.owner, 16)).to.equal(0);
    expect(item1.creator).to.equal(sellerAddress);
    expect(Number(item1.price)).to.equal(Number(salePrice));
    expect(Number(item1.marketFee)).to.equal(Number(marketFee));
    expect(item1.onSale).to.equal(true);
  });


  it.skip('Should create NFT sale', async () => {
    const marketWithSigner = market.connect(buyer1);

    const iniSellerBalance = await getBalance(sellerAddress, 'seller');
    const iniBuyer1Balance = await getBalance(buyer1Address, 'buyer1');
    const iniArtistBalance = await getBalance(artistAddress, 'artist');
    const iniOwnerBalance = await getBalance(ownerAddress, 'marketOwner');
    const iniTokenOwner = await nft.ownerOf(token1Id);

    // Buy NFT
    console.log('\tbuyer1 buying NFT from seller...');
    await marketWithSigner.createMarketSale(nftContractAddress, item1Id, { value: salePrice });
    console.log('\tNFT bought');

    const endSellerBalance = await getBalance(sellerAddress, 'seller');
    const endBuyer1Balance = await getBalance(buyer1Address, 'buyer1');
    const endArtistBalance = await getBalance(artistAddress, 'artist');
    const endOwnerBalance = await getBalance(ownerAddress, 'marketOwner');
    const endTokenOwner = await nft.ownerOf(token1Id);
    const royaltiesAmount = salePrice * royaltyValue / 10000;
    const marketFeeAmount = (salePrice - royaltiesAmount) * marketFee / 10000;
    
    // Get NFT data
    const item = await marketWithSigner.fetchItem(item1Id);

    // Evaluate results
    expect(iniTokenOwner).to.equal(marketContractAddress);
    expect(endTokenOwner).to.equal(buyer1Address);

    expect(Math.round(endBuyer1Balance)).to.lte(Math.round(iniBuyer1Balance - formatBigNumber(salePrice)))
      .gt(Math.round(iniBuyer1Balance - formatBigNumber(salePrice) - formatBigNumber(maxGasFee)));
    expect(Math.round(endArtistBalance)).to.equal(Math.round(iniArtistBalance + formatBigNumber(royaltiesAmount)));
    expect(Math.round(endOwnerBalance)).to.equal(Math.round(iniOwnerBalance + formatBigNumber(marketFeeAmount)));
    expect(Math.round(endSellerBalance)).to.equal(Math.round(iniSellerBalance + formatBigNumber(salePrice) 
      - formatBigNumber(royaltiesAmount) - formatBigNumber(marketFeeAmount)));
    
    expect(item.nftContract).to.equal(nftContractAddress);
    expect(Number(item.tokenId)).to.equal(token1Id);
    expect(item.sales[0].seller).to.equal(sellerAddress);
    expect(item.sales[0].buyer).to.equal(buyer1Address);
    expect(Number(item.sales[0].price)).to.equal(Number(salePrice));
  });


  it.skip('Should put NFT for sale again and create new sale', async () => {
    let marketWithSigner = market.connect(buyer1);
    let nftWithSigner = nft.connect(buyer1);

    await getBalance(buyer1Address, 'buyer1');
    const iniTokenOwner = await nft.ownerOf(token1Id);

    // Put NFT for sale
    const newSalePrice = ethers.utils.parseUnits('30', 'ether'); // 30 REEF
    
    // Check if market contract is approved by this account (setApprovalForAll links an address
    // to operate on behalf of a certain owner, if the ownership changes, the approval does not
    // work for the new owner)
    const marketApproved = await nftWithSigner.isApprovedForAll(buyer1Address, marketContractAddress);
    if (!marketApproved) {
      // Approve market contract for this address
      console.log('\tcreating approval for market contract...');
      await nftWithSigner.setApprovalForAll(marketContractAddress, true);
      console.log('\tApproval created');
    }

    console.log('\tbuyer1 putting NFT on sale...');
    await marketWithSigner.putMarketItemOnSale(item1Id, newSalePrice);
    console.log('\tNFT sale created');

    marketWithSigner = market.connect(buyer2);

    const iniSellerBalance = await getBalance(sellerAddress, 'seller');
    const iniBuyer1Balance = await getBalance(buyer1Address, 'buyer1');
    const iniBuyer2Balance = await getBalance(buyer2Address, 'buyer2');
    const iniArtistBalance = await getBalance(artistAddress, 'artist');
    const iniOwnerBalance = await getBalance(ownerAddress, 'marketOwner');

    // Buy NFT
    console.log('\tbuyer2 buying NFT from buyer1...');
    await marketWithSigner.createMarketSale(nftContractAddress, item1Id, { value: newSalePrice });
    console.log('\tNFT bought');

    const endSellerBalance = await getBalance(sellerAddress, 'seller');
    const endBuyer1Balance = await getBalance(buyer1Address, 'buyer1');
    const endBuyer2Balance = await getBalance(buyer2Address, 'buyer2');
    const endArtistBalance = await getBalance(artistAddress, 'artist');
    const endOwnerBalance = await getBalance(ownerAddress, 'marketOwner');
    const endTokenOwner = await nft.ownerOf(token1Id);
    const royaltiesAmount = newSalePrice * royaltyValue / 10000;
    const marketFeeAmount = (newSalePrice - royaltiesAmount) * marketFee / 10000;
    
    // Get NFT data
    const item = await marketWithSigner.fetchItem(item1Id);

    // Evaluate results
    expect(iniTokenOwner).to.equal(buyer1Address);
    expect(endTokenOwner).to.equal(buyer2Address);

    expect(iniSellerBalance).to.equal(endSellerBalance);
    expect(Math.round(endBuyer2Balance)).to.lte(Math.round(iniBuyer2Balance - formatBigNumber(newSalePrice)))
      .gt(Math.round(iniBuyer2Balance - formatBigNumber(newSalePrice) - formatBigNumber(maxGasFee)));
    expect(Math.round(endArtistBalance)).to.equal(Math.round(iniArtistBalance + formatBigNumber(royaltiesAmount)));
    expect(Math.round(endOwnerBalance)).to.equal(Math.rount(iniOwnerBalance + formatBigNumber(marketFeeAmount)));
    expect(Math.round(endBuyer1Balance)).to.equal(Math.round(iniBuyer1Balance + formatBigNumber(newSalePrice) 
      - formatBigNumber(royaltiesAmount) - formatBigNumber(marketFeeAmount)));

    expect(item.nftContract).to.equal(nftContractAddress);
    expect(Number(item.tokenId)).to.equal(token1Id);
    expect(item.creator).to.equal(sellerAddress);
    expect(item.sales[1].seller).to.equal(buyer1Address);
    expect(item.sales[1].buyer).to.equal(buyer2Address);
    expect(Number(item.sales[1].price)).to.equal(Number(newSalePrice));
    expect(item.onSale).to.equal(false);
  });


  async function getBalance(address, name) {
    const balance = await reefToken.balanceOf(address);
    const balanceFormatted = formatBigNumber(balance);
    console.log(`\t\tBalance of ${name}:`, balanceFormatted);
  
    return balanceFormatted;
  }
  

  function formatBigNumber(bigNumber) {
    return Number(Number(ethers.utils.formatUnits(bigNumber.toString(), 'ether')).toFixed(2));
  }

});
