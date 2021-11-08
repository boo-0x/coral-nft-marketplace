import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { fromPromise } from 'rxjs/internal-compatibility';
import { NFT } from '../_model/nft';
import { ReefService } from '../_service/reef.service';

@Component({
  selector: 'app-my-nfts-on-sale',
  templateUrl: './my-nfts-on-sale.component.html'
})
export class MyNftsOnSaleComponent implements OnInit {

  nftsOnSale: NFT[];

  constructor(private reefService: ReefService,
              private toastr: ToastrService,
              private translate: TranslateService) { }

  ngOnInit(): void {
    this.reefService.signerSelectionSubject.subscribe((exists: boolean) => { 
      if (!exists) { return }
      fromPromise(this.reefService.getAccountItemsOnSale()).subscribe(
        (nfts: NFT[]) => this.nftsOnSale = nfts,
        (error: any) => {
          this.toastr.error(
						this.translate.instant('toast.fetch-nfts-error'),
						this.translate.instant('toast.error')
					);
        }
      );
    });
  }

}
