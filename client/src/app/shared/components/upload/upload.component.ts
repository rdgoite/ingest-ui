import {Component, Output, EventEmitter, Input, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {BrokerService} from "../../services/broker.service";
import {Observable} from "rxjs";
import {UploadResults} from "../../models/uploadResults";
import {Router} from "@angular/router";
import {AlertService} from "../../services/alert.service";
import {LoaderService} from "../../services/loader.service";

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class UploadComponent implements OnInit {

  @ViewChild('fileInput', { static: true }) fileInput;
  @ViewChild('projectUuidInput', { static: true }) projectIdInput;

  error$: Observable<String>;

  uploadResults$: Observable<UploadResults>;

  @Input() projectUuid;

  @Output() fileUpload = new EventEmitter();

  constructor(private brokerService: BrokerService,
              private router: Router,
              private alertService: AlertService,
              private loaderService: LoaderService) {
  }

  ngOnInit() {}

  upload() {
    let fileBrowser = this.fileInput.nativeElement;
    if (fileBrowser.files && fileBrowser.files[0]) {
      this.loaderService.display(true);
      const formData = new FormData();
      formData.append("file", fileBrowser.files[0]);

      let projectUuid = this.projectIdInput.nativeElement.value;

      if(projectUuid){
        formData.append("projectUuid", projectUuid );
      }

      this.brokerService.uploadSpreadsheet(formData).subscribe({
        next: data => {
          this.uploadResults$ = <any>data;
          let submissionId = this.uploadResults$['details']['submission_id'];
          this.loaderService.display(false);
          this.alertService.success("Upload Success", this.uploadResults$['message'], true, true);
          this.router.navigate(['/submissions/detail'], { queryParams: { id: submissionId, project: this.projectUuid } } );
        },
        error: err => {
          this.error$ = <any>err;
          this.alertService.error(this.error$['message'], this.error$['details']);
          this.loaderService.display(false);
        }
      });
    } else {
      this.alertService.clear();
      this.alertService.error("No file chosen!", "Please choose a spreadsheet to upload.", false, true)
    }
  }
}
