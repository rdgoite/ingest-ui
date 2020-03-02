import {Component, OnDestroy, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {IngestService} from '../shared/services/ingest.service';
import {ActivatedRoute, Router} from '@angular/router';
import {TimerObservable} from 'rxjs/observable/TimerObservable';
import {AlertService} from '../shared/services/alert.service';
import {HttpErrorResponse} from '@angular/common/http';
import {SubmissionEnvelope} from '../shared/models/submissionEnvelope';
import {LoaderService} from '../shared/services/loader.service';


@Component({
  selector: 'app-submission',
  templateUrl: './submission.component.html',
  styleUrls: ['./submission.component.scss']
})
export class SubmissionComponent implements OnInit, OnDestroy {
  MAX_ERRORS = 9;


  submissionEnvelope$: Observable<any>;
  submissionEnvelope;
  submissionEnvelopeId: string;
  submissionEnvelopeUuid: string;
  submissionState: string;

  activeTab: string;

  isValid: boolean;
  isLinkingDone: boolean;
  isSubmitted: boolean;
  submitLink: string;
  url: string;

  project: Object;

  relatedProject: Object;
  relatedProjectName: string;
  relatedProjectUuid: string;

  manifest: Object;
  submissionErrors: any[];

  private alive: boolean;
  private pollInterval: number;


  constructor(
    private alertService: AlertService,
    private ingestService: IngestService,
    private route: ActivatedRoute,
    private router: Router,
    private loaderService: LoaderService
  ) {
    this.pollInterval = 4000; // 4s
    this.alive = true;
    this.manifest = {};
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(queryParams => {
      this.submissionEnvelopeUuid = queryParams.get('uuid');
    });

    this.submissionEnvelopeId = this.route.snapshot.paramMap.get('id');
    const tab = this.route.snapshot.paramMap.get('tab');

    this.activeTab = tab ? tab.toLowerCase() : '';

    if (!this.submissionEnvelopeId && !this.submissionEnvelopeUuid) {
      this.relatedProjectUuid = this.route.snapshot.paramMap.get('projectUuid');
      if (this.relatedProjectUuid) {
        this.getRelatedProject(this.relatedProjectUuid);
      }
    } else {
      this.pollSubmissionEnvelope();
      this.pollEntities();

    }
  }

  ngOnDestroy() {
    this.alive = false; // switches your IntervalObservable off
  }

  pollSubmissionEnvelope() {
    TimerObservable.create(0, this.pollInterval)
      .takeWhile(() => this.alive) // only fires when component is alive
      .subscribe(() => {
        this.getSubmissionEnvelope();
        if (this.submissionEnvelope) {
          this.getSubmissionErrors();
          this.getSubmissionManifest();
        }
      });
  }

  pollEntities() {
    TimerObservable.create(500, this.pollInterval)
      .takeWhile(() => this.alive) // only fires when component is alive
      .subscribe(() => {
        if (this.submissionEnvelopeId) {
          this.getSubmissionProject(this.submissionEnvelopeId);
        }
      });
  }

  checkIfValid(submission) {
    const status = submission['submissionState'];
    const validStates = ['Valid', 'Submitted', 'Processing', 'Archiving', 'Cleanup', 'Complete'];
    return (validStates.indexOf(status) >= 0);
  }

  getRelatedProject(projectUuid) {
    this.ingestService.getProjectByUuid(projectUuid)
      .subscribe(project => {
        this.setRelatedProject(project);
      });
  }

  getSubmissionProject(id) {
    this.ingestService.getSubmissionProject(id).subscribe(project => {
      this.setProject(project);
    });

    this.ingestService.getRelatedProject(id).subscribe(project => {
      this.setRelatedProject(project);
    });

  }

  setProject(project) {
    this.project = project;
  }

  setRelatedProject(project) {
    this.relatedProject = project;
    this.relatedProjectName = this.getProjectName(project);
    this.relatedProjectUuid = this.getProjectUuid(project);
  }

  getProjectName(project) {
    return project && project['content'] ? project['content']['project_core']['project_title'] : '';
  }

  getProjectUuid(project) {
    return project && project['uuid'] ? project['uuid']['uuid'] : '';
  }

  isStateSubmitted(state) {
    const submittedStates = ['Submitted', 'Processing', 'Archiving', 'Cleanup', 'Complete'];
    return (submittedStates.indexOf(state) >= 0);
  }

  getLink(submissionEnvelope, linkName) {
    const links = submissionEnvelope['_links'];
    return links && links[linkName] ? links[linkName]['href'] : null;
  }

  /**
   * Return the CSS class name corresponding to the current submission state value, for styling the submission state
   * chip.
   *
   * @param submissionState {string}
   * @returns {string}
   */
  getSubmissionStateChipClassName(submissionState: string): string {

    if (submissionState === 'Pending' || submissionState === 'Draft') {
      return 'warning';
    }

    if (submissionState === 'Valid') {
      return 'success';
    }

    if (submissionState === 'Validating') {
      return 'info';
    }

    if (submissionState === 'Invalid') {
      return 'danger';
    }

    if (submissionState === 'Submitted') {
      return 'secondary';
    }

    if (submissionState === 'Processing' || submissionState === 'Cleanup' || submissionState === 'Archiving') {
      return 'warning-invert';
    }

    if (submissionState === 'Complete') {
      return 'success-invert';
    }

    return '';
  }

  onDeleteSubmission(submissionEnvelope: SubmissionEnvelope) {
    const submissionId: String = this.getSubmissionId(submissionEnvelope);
    const projectName = this.getProjectName(this.relatedProject);
    const projectInfo = projectName ? `(${projectName})` : '';
    const projectUrl = `/projects/detail?uuid=${this.getProjectUuid(this.relatedProject)}`;
    const submissionUuid = submissionEnvelope['uuid']['uuid'];
    const message = `This may take some time. Are you sure you want to delete the submission with UUID ${submissionUuid} ${projectInfo} ?`;
    const messageOnSuccess = `The submission with UUID ${submissionUuid} ${projectInfo} was deleted!`;
    const messageOnError = `An error has occurred while deleting the submission w/UUID ${submissionUuid} ${projectInfo}`;

    if (confirm(message)) {
      this.loaderService.display(true);
      this.ingestService.deleteSubmission(submissionId).subscribe(
        data => {
          this.alertService.clear();
          this.alertService.success('', messageOnSuccess);
          this.loaderService.display(false);
          this.router.navigateByUrl(projectUrl);
        },
        err => {
          this.alertService.clear();
          this.alertService.error(messageOnError, err);
          console.log('error deleting submission', err);
          this.loaderService.display(false);
          this.router.navigateByUrl(projectUrl);
        });
    }
  }

  private getSubmissionEnvelope() {
    if (this.submissionEnvelopeId) {
      this.submissionEnvelope$ = this.ingestService.getSubmission(this.submissionEnvelopeId);
    } else if (this.submissionEnvelopeUuid) {

      this.submissionEnvelope$ = this.ingestService.getSubmissionByUuid(this.submissionEnvelopeUuid);
    } else {
      this.submissionEnvelope$ = null;
    }

    if (this.submissionEnvelope$) {
      this.submissionEnvelope$
        .subscribe(data => {
          this.submissionEnvelope = data;
          this.submissionEnvelopeId = this.getSubmissionId(data);
          this.isValid = this.checkIfValid(data);
          this.submissionState = data['submissionState'];
          this.isSubmitted = this.isStateSubmitted(data.submissionState);
          this.submitLink = this.getLink(data, 'submit');
          this.url = this.getLink(data, 'self');
        });
    }
  }

  private getSubmissionId(submissionEnvelope) {
    const links = submissionEnvelope['_links'];
    return links && links['self'] && links['self']['href'] ? links['self']['href'].split('/').pop() : '';
  }

  private getSubmissionErrors() {
    this.ingestService.get(this.submissionEnvelope['_links']['submissionEnvelopeErrors']['href'])
      .subscribe(
        data => {
          this.submissionErrors = data['_embedded'] ? data['_embedded']['submissionErrors'] : [];
          this.alertService.clear();
          if (this.submissionErrors.length > this.MAX_ERRORS) {
            const link = this.submissionEnvelope._links.submissionEnvelopeErrors.href;
            const message = `Cannot show more than ${this.MAX_ERRORS} errors.`;
            this.alertService.error(
              `${this.submissionErrors.length - this.MAX_ERRORS} Other Errors`,
              `${message} <a href="${link}">View all ${this.submissionErrors.length} errors.</a>`,
              false,
              false);
          }
          let errors_displayed = 0;
          for (const err of this.submissionErrors) {
            if (errors_displayed >= this.MAX_ERRORS) {
              break;
            }
            this.alertService.error(err['title'], err['detail'], false, false);
            errors_displayed++;
          }
        }
      );
  }

  private getSubmissionManifest() {
    this.ingestService.get(this.submissionEnvelope['_links']['submissionManifest']['href'])
      .subscribe(
        data => {
          this.manifest = data;
          const actualLinks = this.manifest['actualLinks'];
          const expectedLinks = this.manifest['expectedLinks'];
          if (!expectedLinks || (actualLinks == expectedLinks)) {
            this.isLinkingDone = true;
          }
        }, err => {
          this.isLinkingDone = false;
          if (err instanceof HttpErrorResponse && err.status == 404) {
            // do nothing, the endpoint throws error when no submission manifest is found
          } else {
            console.log(err);
          }
        });
  }
}
