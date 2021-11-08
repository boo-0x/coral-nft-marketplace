import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { fromPromise } from 'rxjs/internal-compatibility';
import { NFT } from '../_model/nft';
import { ReefService } from '../_service/reef.service';

@Component({
  selector: 'app-created',
  templateUrl: './created.component.html',
  styleUrls: ['./created.component.scss']
})
export class CreatedComponent implements OnInit {

  createdNFTs: NFT[];

  constructor(private reefService: ReefService,
              private toastr: ToastrService,
              private translate: TranslateService) { }

  ngOnInit(): void {
    this.reefService.signerSelectionSubject.subscribe((exists: boolean) => { 
      if (!exists) { return }
      fromPromise(this.reefService.getAccountCreatedNfts()).subscribe(
        (nfts: NFT[]) => this.createdNFTs = nfts,
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
