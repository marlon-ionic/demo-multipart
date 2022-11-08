import { Component, NgZone, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { HTTP } from '@awesome-cordova-plugins/http/ngx';
import { Platform } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit {
  isLoading = false;
  uploadForm: FormGroup;
  formData = new FormData();
  responseData?: any;
  errorResponse?: any;

  constructor(private http: HTTP, private platform: Platform, private zone: NgZone) {
    this.uploadForm = new FormGroup({
      email: new FormControl('email@email.com'),
      firstName: new FormControl('Hello'),
      lastName: new FormControl('World'),
      image: new FormControl<File|Blob|string|undefined>(undefined),
      jsonFile: new FormControl<File|Blob|string|undefined>(undefined)
    });
  }

  async ngOnInit(): Promise<void> {
    console.log('init', this.platform.is('cordova'),this.platform.is('capacitor'));
    this.formData = new FormData();
    // await this.callPost();
  }

  async onSubmit() {
    this.zone.run(async () => {
      console.log('submit', this.uploadForm.getRawValue());
    this.formData.set('firstName', this.uploadForm.get('firstName')?.value);
    this.formData.set('lastName', this.uploadForm.get('lastName')?.value);
    this.formData.set('email', this.uploadForm.get('email')?.value);
    try {
      console.log('cookieString (/)', this.http.getCookieString('/'));
      console.log(`cookieString (${environment.apiHost})`, this.http.getCookieString(environment.apiHost));
      console.log(`document.cookie`, document.cookie);
      console.log('sending jsonFile', this.formData.get('jsonFile'));
      console.log(`sending formData`, this.formData);
      this.http.setDataSerializer('multipart');

      this.isLoading = true;
      const response = await this.http.post(`${environment.apiEndpoint}/upload`, this.formData, undefined);
      this.responseData = response.data;
      console.log('response.data', response.data, 'response',response);
    } catch(e) {
      console.log('error', e);
      this.errorResponse = e;
    } finally {
      this.isLoading = false;
    }
    });
  }

  async uploadChange(e: Event ) {
    const target = e.target as HTMLInputElement;
    const files = target.files as FileList;
    console.log('uploadChange', e);
    const file = files.item(0);
    if(files !== null || file !== null) {
      this.formData.set('image', file as Blob);
      try {
        const base64String = await this.toBase64(file);
        const jsonObject = this.uploadForm.getRawValue();
        jsonObject.image = base64String;

        const fileWriteResult =  await Filesystem.writeFile({
          path: 'formPayload.json',
          data: JSON.stringify(jsonObject),
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });

        console.log('fileWriteResult', fileWriteResult, fileWriteResult.uri);
        const response = await fetch(fileWriteResult.uri);
        const blob = await response.blob();

        const jsonBlob = this.buildJsonBlob(jsonObject);
        this.formData.set('jsonFile', jsonBlob);
        console.log('built json', jsonObject, blob);
      } catch(error) {
        console.log('failed to convert to base64 string!', error);
      }
    }
  }

  private buildJsonBlob(o: any): Blob {
    const jsonString = JSON.stringify(o);
    const blob = new Blob([jsonString], {type: 'application/json'});
    const url  = URL.createObjectURL(blob);
    console.log('buildJson', o, url);
    return blob;
  }

  private toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
}
