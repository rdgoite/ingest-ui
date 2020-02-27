import {Observable} from 'rxjs/Rx';
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {catchError, tap} from 'rxjs/operators';
import {UploadResults} from '../models/uploadResults';

import {environment} from '../../../environments/environment';
import {Subscription, throwError} from 'rxjs/index';

// Making use of https://stackoverflow.com/questions/35326689/how-to-catch-exception-correctly-from-http-request

@Injectable()
export class BrokerService {

  API_URL: string = environment.BROKER_API_URL;

  constructor(private http: HttpClient) {
  }

  public uploadSpreadsheet(formData, isUpdate = false): Observable<UploadResults> {
    const uploadApiSuffix = isUpdate ? '_update' : '';
    return this.http.post<UploadResults>(`${this.API_URL}/api_upload${uploadApiSuffix}`, formData)
      .pipe(
        tap(data => console.log('server data:', data)),
        catchError(this.handleError('uploadSpreadsheet'))
      );
  }

  public downloadSpreadsheet(submissionUuid): Subscription {
    return this.http
      .get(`${this.API_URL}/submissions/${submissionUuid}/spreadsheet`,
        {observe: 'response', responseType: 'blob'}
      ).map((res) => {
        const contentDisposition = res.headers.get('content-disposition');
        const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
        const response = {
          'data': res.body,
          'filename': filename
        };
        return response;
      }).subscribe(response => {
        console.log('downloaded spreadsheet!');
        const filename = response['filename'];
        const newBlob = new Blob([response['data']]);

        // For other browsers:
        // Create a link pointing to the ObjectURL containing the blob.
        const data = window.URL.createObjectURL(newBlob);

        const link = document.createElement('a');
        link.href = data;
        link.download = filename;
        // this is necessary as link.click() does not work on the latest firefox
        link.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));

        setTimeout(function () {
          // For Firefox it is necessary to delay revoking the ObjectURL
          window.URL.revokeObjectURL(data);
          link.remove();
        }, 100);
      });
  }

  private handleError(operation: any) {
    return (err: any) => {
      const errMsg = `error in ${operation}()`;
      console.log(`${errMsg}:`, err);

      const httpError = {
        message: 'An error occurred in uploading spreadsheet',
        details: `${err.name}: ${err.message}`
      };

      const error = err.error && err.error.message && err.error.details ? err.error : httpError;
      return throwError(error);
    };
  }

}
