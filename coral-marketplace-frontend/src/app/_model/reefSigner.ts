import { SafeHtml } from '@angular/platform-browser';
import { Signer } from '@reef-defi/evm-provider';

export class ReefSigner {
    signer: Signer;
    name: string;
    address: string;
    evmAddress: string;
    isEvmClaimed: boolean;
    selected: boolean;
    identicon: SafeHtml;
}