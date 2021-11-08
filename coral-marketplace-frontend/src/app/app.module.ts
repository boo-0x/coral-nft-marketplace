import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { FormsModule } from '@angular/forms';
import { ToastrModule } from 'ngx-toastr';
import { NgxFileDropModule } from 'ngx-file-drop';
import { NgChartsModule } from 'ng2-charts';
import { MatSliderModule } from '@angular/material/slider';
import { NgxSpinnerModule } from 'ngx-spinner';

import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { FourZeroFourComponent } from './four-zero-four/four-zero-four.component';
import { CreateFormComponent } from './create-form/create-form.component';
import { MarketComponent } from './market/market.component';
import { MyNftsComponent } from './my-nfts/my-nfts.component';
import { CreatedComponent } from './created/created.component';
import { NftDetailComponent } from './nft-detail/nft-detail.component';
import { ChartComponent } from './chart/chart.component';
import { BannerComponent } from './banner/banner.component';
import { ToggleButtonComponent } from './toggle-button/toggle-button.component';
import { MyNftsOnSaleComponent } from './my-nfts-on-sale/my-nfts-on-sale.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FourZeroFourComponent,
    CreateFormComponent,
    MarketComponent,
    MyNftsComponent,
    CreatedComponent,
    NftDetailComponent,
    ChartComponent,
    BannerComponent,
    ToggleButtonComponent,
    MyNftsOnSaleComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    FormsModule,
    BrowserAnimationsModule,
    HttpClientModule,
    NgxFileDropModule,
    MatSliderModule,
    NgxSpinnerModule,
    NgChartsModule.forRoot({
      defaults: {},
      plugins: [ ]
    }),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [HttpClient]
      }
    }),
    ToastrModule.forRoot({
      timeOut: 5000,
      preventDuplicates: true,
      positionClass: 'toast-bottom-left'
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

export function createTranslateLoader(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient, './assets/i18n/', '.json');
}
