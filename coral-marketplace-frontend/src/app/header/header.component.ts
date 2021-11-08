import { Component, OnInit, Renderer2 } from '@angular/core';
import { fromPromise } from 'rxjs/internal-compatibility';
import { ReefSigner } from '../_model/reefSigner';
import { getTheme, saveSignerPointer, saveTheme } from '../_service/localStore';
import { ReefService } from '../_service/reef.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  signers: ReefSigner[];
  selectedSigner: ReefSigner | null;
  selectedSignerTemp: ReefSigner; // Signer selected in form
  darkMode: boolean;
  isNavbarCollapsed = true;

  constructor(private reefService: ReefService,
              private modalService: NgbModal,
              private renderer: Renderer2) { }

  ngOnInit(): void {
    this.darkMode = getTheme();
    if (this.darkMode) {
      this.renderer.addClass(document.body, 'dark-theme');
    } else {
      this.renderer.removeClass(document.body, 'dark-theme');
    }

    this.reefService.signersSubject.subscribe((signers: ReefSigner[]|null) => {
      if (!signers) { return }
      this.signers = signers;
      const selection = signers.find(signer => signer.selected);
      this.selectedSigner = selection ? selection : null;
    });
  }

  connectWallet() {
    this.reefService.connect();
  }

  confirmSelection(modal: any) {
    this.reefService.updateSelectedSigner(this.selectedSignerTemp);
    modal.close();
  }

  openModal(modal: any) {
    this.selectedSignerTemp = this.selectedSigner ? this.selectedSigner : new ReefSigner();
    this.modalService.open(modal);
  }

  toggleDarkMode(e: any) {
    if (this.darkMode) {
      this.darkMode = false;
      this.renderer.removeClass(document.body, 'dark-theme');
    } else {
      this.darkMode = true;
      this.renderer.addClass(document.body, 'dark-theme');
    }
    saveTheme(this.darkMode);
  }

}
