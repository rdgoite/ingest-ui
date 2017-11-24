import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import {IngestService} from '../ingest.service';
import {Profile} from "./profile";
import {AuthService} from '../auth/auth.service';
import {Observable} from "rxjs/Observable";
import {Summary} from "./summary";

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class WelcomeComponent implements OnInit {

  profile: any;

  secured$: Observable<Profile>;

  unsecured$: Observable<Profile>;

  summary$: Observable<Summary>;

  constructor(public auth: AuthService, private ingestService: IngestService) {
  }

  ngOnInit() {
    if (this.auth.userProfile) {
      this.profile = this.auth.userProfile;
    } else {
      this.auth.getProfile((err, profile) => {
        this.profile = profile;
      });
    }
    this.secured$ = this.ingestService.getSecured();
    this.unsecured$ = this.ingestService.getUnsecured();
    this.summary$ = this.ingestService.getSummary();
  }
}
