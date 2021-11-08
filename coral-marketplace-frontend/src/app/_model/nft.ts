import { ethers } from 'ethers';

export class Sale {
    seller: string;
    buyer: string;
    price: number;
    dollarPrice?: number;
}

export class NFT {
    itemId: number;
    tokenId: number;
    price: ethers.BigNumber;
    priceFormatted: number;
    seller: string;
    owner: string;
    creator: string;
    onSale: boolean;
    marketFee: number;
    sales: Sale[];
    metadataURI: string;
    imageURI: string;
    name: string;
    description: string;
    royaltiesRecipient?: string;
    royaltiesAmount?: number;
    dollarPrice?: number;

    constructor() {
        this.royaltiesAmount = 0;
    }
}