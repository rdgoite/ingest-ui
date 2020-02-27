import {Component, Input, OnInit} from '@angular/core';
import {IngestService} from '../../shared/services/ingest.service';
import {ActivatedRoute} from '@angular/router';
import {BrokerService} from '../../shared/services/broker.service';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent implements OnInit {
  @Input() submissionEnvelope;
  @Input() project;
  @Input() isLinkingDone: boolean;

  constructor(private ingestService: IngestService,
              private route: ActivatedRoute,
              private brokerService: BrokerService) {
  }

  ngOnInit() {
  }

  downloadFile(uuid: string) {
    this.brokerService.downloadSpreadsheet(uuid);
  }
}
