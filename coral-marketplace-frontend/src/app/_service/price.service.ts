import { Injectable } from '@angular/core';
import { PRICE_API_URL } from '../_config/config';
import { HttpClient } from '../../../node_modules/@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
	providedIn: 'root'
})
export class PriceService {

	constructor(private httpClient: HttpClient) { }

	getReefMarketPrice(): Observable<number> {
		return this.httpClient.get(PRICE_API_URL).pipe(map(
			(response: any) => { 
				return response['reef-finance']['usd'];
			}
		));
	}
}