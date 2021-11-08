import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateFormComponent } from './create-form/create-form.component';
import { CreatedComponent } from './created/created.component';
import { FourZeroFourComponent } from './four-zero-four/four-zero-four.component';
import { MarketComponent } from './market/market.component';
import { MyNftsComponent } from './my-nfts/my-nfts.component';
import { MyNftsOnSaleComponent } from './my-nfts-on-sale/my-nfts-on-sale.component';
import { NftDetailComponent } from './nft-detail/nft-detail.component';

const routes: Routes = [
  {
    path: '', redirectTo: '/market', pathMatch: 'full'
  },
  {
    path: 'market',
    component: MarketComponent
  },
  {
    path: 'create',
    component: CreateFormComponent
  },
  {
    path: 'created',
    component: CreatedComponent
  },
  {
    path: 'my-nfts',
    component: MyNftsComponent
  },
  {
    path: 'my-nfts-on-sale',
    component: MyNftsOnSaleComponent
  },
  {
    path: 'nft/:itemId',
    component: NftDetailComponent
  },
  {
    path: 'sell/:itemId',
    component: CreateFormComponent
  },
  {
    path: '**',
    component: FourZeroFourComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
