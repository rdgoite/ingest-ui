import {Observable} from 'rxjs/Rx';
import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {catchError, tap} from 'rxjs/operators';
import {UploadResults} from "../models/uploadResults";

import {environment} from '../../../environments/environment';
import {throwError} from "rxjs/index";

// Making use of https://stackoverflow.com/questions/35326689/how-to-catch-exception-correctly-from-http-request

@Injectable()
export class BrokerService {

  API_URL: string = environment.BROKER_API_URL;

  constructor(private http: HttpClient) {
  }

  private handleError(operation: any) {
    return (err: any) => {
      let errMsg = `error in ${operation}()`;
      console.log(`${errMsg}:`, err);

      let httpError = {
        message: "An error occurred in uploading spreadsheet",
        details: `${err.name}: ${err.message}`
      };

      let error = err.error && err.error.message && err.error.details ? err.error : httpError;
      return throwError(error);
    }
  }

  public uploadSpreadsheet(formData, isUpdate=false): Observable<UploadResults> {
    let uploadApiSuffix = isUpdate ? '_update': '';
    return this.http.post<UploadResults>(`${this.API_URL}/api_upload${uploadApiSuffix}`, formData)
      .pipe(
        tap(data => console.log('server data:', data)),
        catchError(this.handleError('uploadSpreadsheet'))
      );
  }

  public downloadSpreadsheet(submissionUuid): Observable<any> {
    return this.http
      .get(`${this.API_URL}/submissions/${submissionUuid}/spreadsheet`,
        { observe: 'response',responseType: 'blob' }
      ).map((res) => {
        let contentDisposition = res.headers.get('content-disposition');
        let filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
        let response = {
          "data": res.body,
          "filename": filename
        };
        return response
      });
  }

}
