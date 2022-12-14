import { HttpClient } from '@angular/common/http';
import { Component, NgZone, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { App, RestoredListenerEvent } from '@capacitor/app';
import { HttpResponse, CapacitorCookies, CapacitorHttp } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { isStringOrNumber } from '../util';
import { fromPairs } from 'lodash-es';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page implements OnInit {
  isStringOrNumber = isStringOrNumber;
  apiHost = environment.apiEndpoint;
  isLoading = false;
  uploadForm: FormGroup;
  formData = new FormData();
  responseData?: any;
  errorResponse?: any;
  cookieString?: string;

  constructor(private http: HttpClient, private platform: Platform, private zone: NgZone) {
    this.uploadForm = new FormGroup({
      email: new FormControl('email@email.com'),
      firstName: new FormControl('Hello'),
      lastName: new FormControl('World'),
      image: new FormControl<File|Blob|string|undefined>(undefined),
      jsonFile: new FormControl<File|Blob|string|undefined>(undefined)
    });
  }

  async clearCookies() {
    await CapacitorCookies.clearAllCookies();
    this.cookieString = undefined;
  }

  async getCookies() {
    const cookieMap = await CapacitorCookies.getCookies();
    console.log('cookieMap', cookieMap, document.cookie);
    if(cookieMap !== undefined && cookieMap !== null) {
      const obj = fromPairs(cookieMap);
      console.log('fromPairs', obj, JSON.stringify(obj));
      console.log('document.cookie', document.cookie);
      this.cookieString = document.cookie || JSON.stringify(obj);
    }
  }

  async ngOnInit(): Promise<void> {
    await App.removeAllListeners();
    const handlder = await App.addListener('appRestoredResult', (event: RestoredListenerEvent) => console.log('appRestoredResult', event));
    this.formData = new FormData();
    this.getCookies();
    // await this.callPost();
  }

  async onSubmit() {
    const url = `${environment.apiEndpoint}/upload`;
    console.log('submit for', url);
    this.isLoading = true;
    try {
      const getResponse = await CapacitorHttp.get({ url });
      console.log('get', getResponse.headers, getResponse);
      this.processGetResponse(getResponse);
    } catch (e) {
      console.error(`error with GET ${url}:`, e);
      this.isLoading = false;
      this.errorResponse = e;
    }
    }

  async uploadChange(e: Event ) {
    const target = e.target as HTMLInputElement;
    const files = target.files as FileList;
    const file = files.item(0);
    console.log('uploadChange', e, file);
      try {
        // Here we build the JSON response then conver to Blob before setting it to FormData
        const jsonObject = this.uploadForm.getRawValue();
        console.log('starting json');
        const base64String = await this.toBase64(file);
        console.log('B64 img');
        jsonObject.image = base64String;
        const jsonBlob = this.buildJsonBlob(jsonObject);
        this.formData.set('jsonFile', jsonBlob);
        console.log('done json');

      } catch(error) {
        console.log('failed to convert to base64 string!', error);
      }
  }

  private async processGetResponse(getResponse: HttpResponse) {
    console.log('processGetResponse');
    this.isLoading = true;
    this.formData.set('firstName', this.uploadForm.get('firstName')?.value);
    this.formData.set('lastName', this.uploadForm.get('lastName')?.value);
    this.formData.set('email', this.uploadForm.get('email')?.value);
    const cookieMap = await CapacitorCookies.getCookies();
    console.log('cookies', cookieMap, document.cookie);


    // This simple API that I setup requires a `key` cookie (any value) be set. Otherwise the POST will return a 403 error
    await CapacitorCookies.setCookie({
      url: environment.apiEndpoint,
      key: 'key',
      value: cookieMap.getkey || 'no-server-key',
    });
    try {
      const response  = await  CapacitorHttp.post({
        url: `${environment.apiEndpoint}/upload`,
        responseType:'json'
      });
      console.log('post', response);
      this.responseData = response.data;
    } catch(e) {
      console.log('post: error', e);
      this.errorResponse = e;
    } finally {
      this.isLoading = false;
    }
  }

  private buildJsonBlob(o: any): Blob {
    const jsonString = JSON.stringify(o);
    const blob = new Blob([jsonString], {type: 'application/json'});
    const url  = URL.createObjectURL(blob);
    console.log('buildJson', o, url);
    return blob;
  }

  private toBase64(file: File | Blob): Promise<string> {
    console.log('toBase64', file);
    return new Promise((resolve, reject) => {
    // Be sure to use the patched FileReader generated by the code below!
    // There appear to be serialization issues that cause silent errors at the moment.
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      console.log('reader resolved', reader.result);
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      console.log('reader onerror', error);
      reject(error);
    };
});
  }

}
