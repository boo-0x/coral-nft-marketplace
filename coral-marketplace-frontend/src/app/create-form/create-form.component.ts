import { Component, OnInit } from '@angular/core';
import { NFT } from '../_model/nft';
import { IpfsService } from '../_service/ipfs.service';
import { ReefService } from '../_service/reef.service';
import { Metadata } from '../_model/matadata';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { fromPromise } from 'rxjs/internal-compatibility';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
	selector: 'app-create',
	templateUrl: './create-form.component.html',
	styleUrls: ['./create-form.component.scss']
})
export class CreateFormComponent implements OnInit {

	existingNft: boolean;
	nft: NFT = new NFT();
	newImage: File;
	marketFee: number;

	constructor(private reefService: ReefService,
				private ipfsService: IpfsService,
				private translate: TranslateService,
				private toastr: ToastrService,
				private route: ActivatedRoute,
				private spinner: NgxSpinnerService,
				private router: Router) { }

	ngOnInit(): void {
		const itemId = this.route.snapshot.params['itemId'];
		if (itemId) {
			this.existingNft = true;
			fromPromise(this.reefService.getNft(itemId)).subscribe(
				(nft: NFT) => {
					nft.priceFormatted = 0;
					this.nft = nft;
				},
				(error: any) => {
					this.toastr.error(
						this.translate.instant('toast.fetch-nft-error'),
						this.translate.instant('toast.error')
					);
				}
			);
		}

		this.reefService.marketFeeSubject.subscribe((marketFee: number) => { 
			this.marketFee = marketFee;
		});
	}

	dropped(files: NgxFileDropEntry[]) {
		console.log(files)
		if (files[0].fileEntry.isFile) {
			const fileEntry = files[0].fileEntry as FileSystemFileEntry;
			fileEntry.file((file: File) => {
				console.log(file);

				const mimeType = file.type;

				if (mimeType.match(/image\/*/) == null) {
					this.toastr.error(
						this.translate.instant('toast.file-format-error'),
						this.translate.instant('toast.error')
					);
					return;
				}
		
				if (file.size > 104857600) {
					this.toastr.error(
						this.translate.instant('toast.file-too-large-error'),
						this.translate.instant('toast.error')
					);
					return;
				} 

				const reader = new FileReader();
				reader.readAsDataURL(file);
				reader.onload = () => {
					this.nft.imageURI = reader.result as string;
				};

				this.newImage = file;
			});
		} else {
			this.toastr.error(
				this.translate.instant('toast.file-upload-error'),
				this.translate.instant('toast.error')
			);
		}
	}

	formatLabel(value: number) {
		return value / 100;
	}

	async putOnSale() {
		this.spinner.show();

		if (this.existingNft) {
			this.putOnSaleExisting();
		} else {
			this.putOnSaleNew();
		}
	}

	private async putOnSaleExisting() {
		fromPromise(this.reefService.putExistingNftOnSale(this.nft.itemId, this.nft.priceFormatted)).subscribe(
			(success: boolean) => {
				this.spinner.hide();
				this.toastr.success(
					this.translate.instant('toast.nft-on-sale'),
					this.translate.instant('toast.success')
				);
				this.router.navigate([`/nft/${this.nft.itemId}`]);
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
						this.translate.instant('toast.create-sale-error'),
						this.translate.instant('toast.error'),
					);
				}
			}
		);
	}

	private async putOnSaleNew() {
		const ipfsImageUrl = await this.ipfsService.uploadToIPFS(this.newImage);

		const metadata: Metadata = {
			name: this.nft.name, 
			description: this.nft.description, 
			imageURI: ipfsImageUrl
		};
		const ipfsMetadataUrl: string = await this.ipfsService.uploadToIPFS(JSON.stringify(metadata));
		if (ipfsMetadataUrl == '') {
			this.spinner.hide();
			this.toastr.error(
				this.translate.instant('toast.upload-ipfs-error'),
				this.translate.instant('toast.error'),
			);
		}

		fromPromise(this.reefService.createNft(ipfsMetadataUrl, this.nft.royaltiesAmount 
			? this.nft.royaltiesAmount : 0, this.nft.priceFormatted)).subscribe(
			(itemId: number) => {
				this.spinner.hide();
				this.toastr.success(
					this.translate.instant('toast.nft-on-sale'),
					this.translate.instant('toast.success')
				);
				this.router.navigate([`/nft/${itemId}`]);
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
						this.translate.instant('toast.create-sale-error'),
						this.translate.instant('toast.error'),
					);
				}
			}
		);
	}

	cancelCreation() {
		if (this.existingNft) {
			this.router.navigate([`/nft/${this.nft.itemId}`]);
		} else {
			this.nft = new NFT();
		}
	}
}
