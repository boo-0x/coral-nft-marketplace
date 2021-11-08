import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { fromPromise } from 'rxjs/internal-compatibility';
import { NFT, Sale } from '../_model/nft';
import { ReefService } from '../_service/reef.service';
import { PriceService } from '../_service/price.service';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-nft-detail',
  templateUrl: './nft-detail.component.html',
  styleUrls: ['./nft-detail.component.scss']
})
export class NftDetailComponent implements OnInit {

  itemId: number;
  nft: NFT;
  nftPrice: number;
  currentAddress: string;
  private reefMarketPrice: number;

  constructor(private reefService: ReefService,
              private route: ActivatedRoute,
              private router: Router,
              private priceService: PriceService,
              private toastr: ToastrService,
              private translate: TranslateService,
              private spinner: NgxSpinnerService) { }

  ngOnInit(): void {
    this.itemId = this.route.snapshot.params['itemId'];

    this.reefService.existsProviderSubject.subscribe((exists: boolean) => { 
      if (!exists) { return }
      this.loadNft();
    });

    this.priceService.getReefMarketPrice().subscribe((marketPrice: number) => {
      this.reefMarketPrice = marketPrice;
      if (this.nft) {
        this.setDollarPrices();
      }
    });

    this.reefService.signerSelectionSubject.subscribe((exists: boolean) => { 
      if (!exists) { return }
      this.currentAddress = this.reefService.selectedSigner.evmAddress;
    });
  }

  putOnSale() {
    this.router.navigate([`/sell/${this.nft.itemId}`]);
  }

  async buyNFT() {
    this.spinner.show();

    fromPromise(this.reefService.buyNFT(this.nft)).subscribe(
      (success: boolean) => {
        this.spinner.hide();

        this.loadNft();

        this.toastr.success(
          this.translate.instant('toast.nft-bought'),
          this.translate.instant('toast.success')
        );
      },
      (error: any) => {
        this.spinner.hide();

        console.log(error);
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

  private loadNft() {
    fromPromise(this.reefService.getNft(this.itemId)).subscribe(
      (nft: NFT) => { 
        this.nft = nft; 
        if (this.reefMarketPrice) {
          this.setDollarPrices();
        }
      },
      (error: any) => {
        this.toastr.error(
          this.translate.instant('toast.fetch-nft-error'),
          this.translate.instant('toast.error')
        );
      }
    );
  }

  private setDollarPrices() {
    this.nft.dollarPrice = this.nft.priceFormatted * this.reefMarketPrice;
    this.nft.sales.forEach((sale: Sale) => { 
      sale.dollarPrice = sale.price * this.reefMarketPrice;
    });
  }
  
}
