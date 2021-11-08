import { Injectable } from '@angular/core';
import NftAbi from '../_contracts/CoralNFT.json';
import MarketAbi from '../_contracts/CoralMarketplace.json';
import { Provider, Signer } from '@reef-defi/evm-provider';
import { environment } from 'src/environments/environment';
import { WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import type { Signer as InjectedSigner } from '@polkadot/api/types';
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { BehaviorSubject } from 'rxjs';
import { ethers } from 'ethers';
import { getSignerPointer, saveSignerPointer } from './localStore';
import { NFT } from '../_model/nft';
import { ReefSigner } from '../_model/reefSigner';
import { NetworkConfig } from '../_model/networkConfig';
import { REEF_MAINNET, REEF_TESTNET } from '../_config/config';
import { HttpClient } from '@angular/common/http';
import { Metadata } from '../_model/matadata';
import * as identicon from '@polkadot/ui-shared';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class ReefService {
  evmProvider: Provider;
  signers: ReefSigner[];
  selectedSigner: ReefSigner;

  private nftContract: ethers.Contract;
  private marketContract: ethers.Contract;
  private network: NetworkConfig = environment.reefTestnet ? REEF_TESTNET : REEF_MAINNET;

  signersSubject = new BehaviorSubject<ReefSigner[]|null>(null);
  existsProviderSubject = new BehaviorSubject<boolean>(false);
  signerSelectionSubject = new BehaviorSubject<boolean>(false);
  marketFeeSubject = new BehaviorSubject<number>(0);

  constructor(private httpClient: HttpClient, 
              private sanitizer: DomSanitizer,
              private translate: TranslateService,
              private toastr: ToastrService) { 
    this.nftContract = new ethers.Contract(this.network.nftContractAddress, NftAbi as any);
    this.marketContract = new ethers.Contract(this.network.marketplaceContractAddress, MarketAbi as any);

    this.initEvmProvider();
  }

  /**
   * Init EVM provider
   */
  private async initEvmProvider(): Promise<any> {
    const evmProvider = new Provider({ provider: new WsProvider(this.network.rpcUrl) });
    await evmProvider.api.isReadyOrError;

    this.evmProvider = evmProvider;
    this.existsProviderSubject.next(true);
    this.connect();
    this.getMarketFee();
  };

  /**
   * Connect to wallet, get available Reef signers and initial signer selection
   */
  async connect() {
    const signers = await this.getSigners();
    const signerPointer = getSignerPointer();
    const selectedAccountIndex = signers.length > signerPointer ? signerPointer : 0;
    signers[selectedAccountIndex].selected = true;

    this.selectedSigner = signers[selectedAccountIndex];
    this.signers = signers;
    
    this.signersSubject.next(signers);
    this.signerSelectionSubject.next(true);
  }

  updateSelectedSigner(newSelection: ReefSigner) {
    saveSignerPointer(this.signers.indexOf(newSelection));
    this.signers.forEach(sig => sig.selected = newSelection == sig);
    this.selectedSigner = newSelection;
    this.signersSubject.next(this.signers);
    this.signerSelectionSubject.next(true);
  }

  /**
  * Helper method to connect and return promise with Reef signers
  */
  private async getSigners(): Promise<ReefSigner[]> {
    const inj = await web3Enable('Coral Marketplace');
    if (!inj.length) {
      this.toastr.info(
        this.translate.instant('toast.polkadot-extension-disabled'),
        ''
      );
      throw new Error('Polkadot extension is disabled! You need to approve the app in Polkadot-extension!');
    } 

    const web3accounts = await web3Accounts();
    if (!web3accounts.length) {
      this.toastr.info(
        this.translate.instant('toast.polkadot-account-needed'),
        ''
      );
      throw new Error('To use this app you need to create Polkadot account in Polkadot-extension!');
    } 

    const signers = await this.accountsToSigners(web3accounts, this.evmProvider, inj[0].signer);
    return signers;
  };

  /**
   * Helper method to convert accounts to signers
   */
  private accountsToSigners = async (accounts: InjectedAccountWithMeta[], provider: Provider, sign: InjectedSigner): Promise<ReefSigner[]> => Promise.all(
    accounts
      .map((account) => ({
        address: account.address,
        name: account.meta.name || '',
        selected: false,
        signer: new Signer(provider, account.address, sign)
      }))
      .map(async (signer): Promise<ReefSigner> => ({
        ...signer,
        evmAddress: await signer.signer.getAddress(),
        isEvmClaimed: await signer.signer.isClaimed(),
        identicon: this.generateIdenticon(signer.address)
      }))
  );

  async getMarketFee(): Promise<any> {
		const marketContractWithProvider = this.marketContract.connect(this.evmProvider);
		const marketFee = await marketContractWithProvider.getMarketFee();
    this.marketFeeSubject.next(Number(marketFee)/100);
  }

  async createNft(ipfsMetadataUrl: string, royaltiesAmount: number, salePrice: number): Promise<number> {
    if (!(await this.checkAccountAndClaim(this.selectedSigner.signer))) {
      throw new Error('No EVM account available');
    }

		const nftContractWithSigner = this.nftContract.connect(this.selectedSigner.signer);
		const tx = await nftContractWithSigner.createToken(ipfsMetadataUrl, this.selectedSigner.evmAddress, royaltiesAmount);
		const receipt = await tx.wait();
		const tokenId = receipt.events[0].args[2].toNumber();

    return this.putNewNftOnSale(tokenId, salePrice);
	}

  private async putNewNftOnSale(tokenId: number, price: number): Promise<number> {
    if (!(await this.checkAccountAndClaim(this.selectedSigner.signer))) {
      throw new Error('No EVM account available');
    }

		const marketContractWithSigner = this.marketContract.connect(this.selectedSigner.signer);
		const tx = await marketContractWithSigner.createMarketItem(
        this.nftContract.address, tokenId, ethers.utils.parseUnits(price.toString(), 'ether'));
		const receipt = await tx.wait();
    const itemId = receipt.events[2].args[0].toNumber();
    return itemId;
  }

  async putExistingNftOnSale(itemId: number, price: number): Promise<boolean> {
    if (!(await this.checkAccountAndClaim(this.selectedSigner.signer))) {
      throw new Error('No EVM account available');
    }

    // Check if market contract has approval for selected address
    const nftContractWithProvider = this.nftContract.connect(this.evmProvider);
    const marketApproved = await nftContractWithProvider.isApprovedForAll(this.selectedSigner.evmAddress, this.marketContract.address);
    if (!marketApproved) {
      // Approve market contract for this address
      const nftContractWithSigner = this.nftContract.connect(this.selectedSigner.signer);
      await nftContractWithSigner.setApprovalForAll(this.marketContract.address, true);
    }

    const marketContractWithSigner = this.marketContract.connect(this.selectedSigner.signer);
    const tx = await marketContractWithSigner.putMarketItemOnSale(itemId, ethers.utils.parseUnits(price.toString(), 'ether'));
    await tx.wait();

    return true;
  }

  async getAvailableNfts(): Promise<NFT[]> {
		const marketContractWithProvider = this.marketContract.connect(this.evmProvider);

		const allNFTs = await marketContractWithProvider.fetchMarketItems();
    
    const availableNFTs = allNFTs.filter((nft: any) => !nft.sold);
    return this.mapNfts(availableNFTs);
  }


  async getAccountOwnedNfts(): Promise<NFT[]> {
		const marketContractWithSigner = this.marketContract.connect(this.selectedSigner.signer);

		const accountOwnedNFTs = await marketContractWithSigner.fetchItemsOwned();

    return this.mapNfts(accountOwnedNFTs);
	}


  async getAccountCreatedNfts(): Promise<NFT[]> {
		const marketContractWithSigner = this.marketContract.connect(this.selectedSigner.signer);

		const accountCreatedNFTs = await marketContractWithSigner.fetchItemsCreated();
    
    return this.mapNfts(accountCreatedNFTs);
	}


  async getAccountItemsOnSale(): Promise<NFT[]> {
		const marketContractWithSigner = this.marketContract.connect(this.selectedSigner.signer);

		const accountOnSaleNFTs = await marketContractWithSigner.fetchItemsOnSale();
    
    return this.mapNfts(accountOnSaleNFTs);
	}


  async getNft(itemId: number): Promise<NFT> {
		const marketContractWithSigner = this.marketContract.connect(this.evmProvider);

		const nft = await marketContractWithSigner.fetchItem(itemId);

    return this.mapNft(nft, true);
	}


  async buyNFT(nft: NFT): Promise<boolean> {
    if (!(await this.checkAccountAndClaim(this.selectedSigner.signer))) {
      throw new Error('No EVM account available');
    }

		const marketContractWithSigner = this.marketContract.connect(this.selectedSigner.signer);
		
		const tx = await marketContractWithSigner.createMarketSale(this.nftContract.address, nft.itemId, {
			value: nft.price
		});
		await tx.wait();
    return true;
	}


  private async mapNfts(items: any): Promise<NFT[]> {
    const nfts: NFT[] = await Promise.all(items.map(async (item: any) => {
      return this.mapNft(item, false);
    }));
    
    return nfts;
  }


  private async mapNft(item: any, withRoyalties: boolean): Promise<NFT> {
    const nftContractWithProvider = this.nftContract.connect(this.evmProvider);

    const metadataUri = await nftContractWithProvider.tokenURI(item.tokenId);
    let metadata: Metadata;
    try {
      metadata = await this.httpClient.get<Metadata>(metadataUri).toPromise();
    } catch (error: any) {
      console.log(error);
      metadata = { name: '', description: '', imageURI: ''};
    }

    const itemSales = item.sales.map((sale: any) => {
      return { 
        seller: sale.seller, 
        buyer: sale.buyer,
        price: this.bigNumberToNumber(sale.price)
      };
    });

    const nft: NFT = {
      itemId: Number(item.itemId),
      tokenId: Number(item.tokenId),
      price: item.price,
      priceFormatted: this.bigNumberToNumber(item.price),
      seller: item.seller,
      owner: item.owner,
      creator: item.creator,
      onSale: item.onSale,
      marketFee: Number(item.marketFee)/100,
      metadataURI: metadataUri,
      imageURI: metadata.imageURI,
      name: metadata.name,
      description: metadata.description,
      sales: itemSales      
    };

    if (withRoyalties) {
      const value = ethers.utils.parseUnits('100', 'ether');
      const royalties = await nftContractWithProvider.royaltyInfo(item.tokenId, value);
      nft.royaltiesRecipient = royalties.receiver;
      nft.royaltiesAmount = this.bigNumberToNumber(royalties.royaltyAmount);
    }

    return nft;
  }


  private bigNumberToNumber(bigNum: ethers.BigNumber): number {
    try {
      return Number(ethers.utils.formatUnits(bigNum.toString(), 'ether'));
    } catch(e: any) {
      console.log('Error formating BigNumber', e);
      return 0;
    }
  }


  private async checkAccountAndClaim(signer: Signer): Promise<boolean> {
    if (!(await signer.isClaimed())) {
      try {
        await signer.claimDefaultAccount();
        return true;
      } catch (e: any) {
        throw new Error(e);
      }
    } else {
      return true;
    }
  }


  private generateIdenticon(address: string): SafeHtml {
    let circles = identicon.polkadotIcon(address, {isAlternative: false});

    const circlesStr = circles.map(({ cx, cy, fill, r }) =>
      `<circle cx=${cx} cy=${cy} fill="${fill}" r=${r} />`
    ).join('');

    return this.sanitizer.bypassSecurityTrustHtml(`<svg height=36 viewBox='0 0 64 64' width=36>${circlesStr}</svg>`);
  }

}

