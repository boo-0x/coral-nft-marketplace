import { NetworkConfig } from 'src/app/_model/networkConfig';

// *********** Locale configs *******************
export class LocaleConfiguration {
    fallbackLocale: string;
    availableLanguages: string[];
}

export const LOCALE_CONFIG: LocaleConfiguration = {
    fallbackLocale: 'en',
    availableLanguages: ['en']
};


// *********** IPFS configs *******************
export const IPFS_API_URL = 'https://ipfs.infura.io:5001/api/v0';
export const IPFS_PREFIX_URL = 'https://ipfs.infura.io/ipfs/';


// *********** Network configs *******************
export const REEF_TESTNET: NetworkConfig = {
    testnet: true,
    rpcUrl: 'wss://rpc-testnet.reefscan.com/ws',
    marketplaceContractAddress: '0x74f596EE820B879850075eDDdd9aA6Ef58BB6716',
    nftContractAddress: '0x068327725148ca468be75A1887c8E1ce26E808aA'
};

export const REEF_MAINNET: NetworkConfig = {
    testnet: false,
    rpcUrl: 'wss://rpc.reefscan.com/ws',
    marketplaceContractAddress: '0xeb25Ad4671Db29a0ada4741566d183a54B249E0c',
    nftContractAddress: '0x454Eb6633f34DE2E12b7a66CD0bd4Ddd3C63b798'
};


// *********** Price API URL *******************
export const PRICE_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=reef-finance&vs_currencies=usd';