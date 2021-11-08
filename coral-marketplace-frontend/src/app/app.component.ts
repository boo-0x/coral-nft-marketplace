import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LOCALE_CONFIG } from './_config/config';

@Component({
  selector: 'app-root',
  template: `
    <ngx-spinner bdColor="#000000a1" size="medium" color="#383838" type="ball-spin-clockwise" [fullScreen]="true"></ngx-spinner>
    <app-header></app-header>
    <app-banner></app-banner>
    <div class="main">
      <router-outlet></router-outlet>
    </div>
  `
})
export class AppComponent {
  constructor(translate: TranslateService) {
    translate.addLangs(LOCALE_CONFIG.availableLanguages);

    translate.setDefaultLang(LOCALE_CONFIG.fallbackLocale);

    const regExp: RegExp = new RegExp(this.composeRegularExpression());

    let browserLang: string = translate.getBrowserCultureLang().replace('-', '_');

    if (!browserLang.match(new RegExp(regExp))) {
      browserLang = translate.getBrowserLang();
    }

    const lang = browserLang.match(regExp) ? browserLang : LOCALE_CONFIG.fallbackLocale;

    translate.use(lang);
  }

  /**
   * Composes regular expression to obtain browser's language
   */
  private composeRegularExpression(): string {

    let regularExpression = '';

    let firstElement = true;

    LOCALE_CONFIG.availableLanguages.forEach(element => {
      if (!firstElement) {
        regularExpression += '|';
      }
      regularExpression += `^${element}$`;
      firstElement = false;
    });

    return regularExpression;
  }

}
