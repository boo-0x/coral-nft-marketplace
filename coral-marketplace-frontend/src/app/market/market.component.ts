import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { fromPromise } from 'rxjs/internal-compatibility';
import { NFT } from '../_model/nft';
import { ReefService } from '../_service/reef.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-market',
  templateUrl: './market.component.html'
})
export class MarketComponent implements OnInit {

  availableNFTs: NFT[];
  currentAddress: string;

  constructor(private reefService: ReefService,
              private router: Router,
              private toastr: ToastrService,
              private translate: TranslateService,
              private spinner: NgxSpinnerService) { }

  ngOnInit(): void {
    this.reefService.existsProviderSubject.subscribe((exists: boolean) => { 
      if (!exists) { return }
      fromPromise(this.reefService.getAvailableNfts()).subscribe(
        (nfts: NFT[]) =>   this.availableNFTs = nfts,
        (error: any) => {
          this.toastr.error(
						this.translate.instant('toast.fetch-nfts-error'),
						this.translate.instant('toast.error')
					);
        }
      );
    });

    this.reefService.signerSelectionSubject.subscribe((exists: boolean) => { 
      if (!exists) { return }
      this.currentAddress = this.reefService.selectedSigner.evmAddress;
    });
  }

  async buyNFT(nft: NFT) {
    this.spinner.show();

		fromPromise(this.reefService.buyNFT(nft)).subscribe(
      (success: boolean) => {
        this.spinner.hide();

        this.toastr.success(
          this.translate.instant('toast.nft-bought'),
          this.translate.instant('toast.success')
        );
        this.router.navigate([`/nft/${nft.itemId}`]);
      },
      (error: any) => {
        this.spinner.hide();

        if (error.toString().includes('Cancelled')) {
					this.toastr.info(
						this.translate.instant('toast.cacelled-by-user')
					);
        } else if (error.toString().includes('InsufficientBalance')) {
          this.toastr.error(
						this.translate.instant('toast.insufficient-balance-error'),
						this.translate.instant('toast.error'),
					);
				} else {
					this.toastr.error(
						this.translate.instant('toast.generic-error'),
						this.translate.instant('toast.error'),
					);
				}
      }
    );
	}

}
