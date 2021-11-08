import { Injectable } from '@angular/core';
import { IPFS_API_URL, IPFS_PREFIX_URL } from '../_config/config';
import { create as ipfsHttpClient } from 'ipfs-http-client';

@Injectable({
	providedIn: 'root'
})
export class IpfsService {

	constructor() { }

	async uploadToIPFS(file: any): Promise<string> {
		try {
			const client = ipfsHttpClient({url: IPFS_API_URL});
			const addedFile = await client.add(file, { progress: (prog: any) => console.log('progress', prog) });
			return IPFS_PREFIX_URL + addedFile.path
		} catch (err) {
			console.log('Error uploading file to IPFS', err);
			return '';
		}
	}
}