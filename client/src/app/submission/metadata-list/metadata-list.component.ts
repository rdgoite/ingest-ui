import {AfterViewChecked, Component, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {IngestService} from '../../shared/services/ingest.service';
import {FlattenService} from '../../shared/services/flatten.service';
import {Page, PagedData} from '../../shared/models/page';
import {Observable, Subscription} from 'rxjs';
import {TimerObservable} from 'rxjs/observable/TimerObservable';
import 'rxjs-compat/add/operator/takeWhile';
import {MetadataDocument} from '../../shared/models/metadata-document';

@Component({
  selector: 'app-metadata-list',
  templateUrl: './metadata-list.component.html',
  styleUrls: ['./metadata-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class MetadataListComponent implements OnInit, AfterViewChecked, OnDestroy {
  pollingSubscription: Subscription;
  pollingTimer: Observable<number>;

  @ViewChild('datatable') table: any;

  @Input() title: string;
  @Input() metadataList;
  @Input() metadataType;
  @Input() expectedCount;

  @Input() config = {
    displayContent: true,
    displayState: true,
    displayAll: false,
    displayColumns: [],
    hideWhenEmptyRows: false
  };
  metadataList$: Observable<PagedData<MetadataDocument>>;
  @Input() submissionEnvelopeId: string;
  editing = {};
  page: Page = {number: 0, size: 0, sort: '', totalElements: 0, totalPages: 0};
  rows: any[];
  expandAll: boolean;
  isPaginated: boolean;
  validationStates: string[];
  filterState: string;
  currentPageInfo: {};
  private alive: boolean;
  private pollInterval: number;
  private isLoading = false;


  constructor(private ingestService: IngestService,
              private flattenService: FlattenService) {
    this.pollInterval = 4000; // 4s
    this.alive = true;
    this.page.number = 0;
    this.page.size = 20;
    this.pollingTimer = TimerObservable.create(0, this.pollInterval)
      .takeWhile(() => this.alive); // only fires when component is alive

    this.validationStates = ['Draft', 'Validating', 'Valid', 'Invalid'];
  }

  ngOnDestroy() {
    this.alive = false; // switches your TimerObservable off
  }

  ngOnInit() {
    this.setPage({offset: 0});
  }

  ngAfterViewChecked() {
    // added a flag to keep the rows expanded even after polling refreshes the rows
    if (this.expandAll) {
      this.table.rowDetail.expandAllRows();
    }
  }

  getAllColumns(rows) {
    const columns = {};
    rows.map(function (row) {
      Object.keys(row).map(function (col) {
        columns[col] = '';
      });
    });

    return this.getColumns(columns);
  }

  getColumns(row) {
    let columns = [];

    if (this.config && this.config.displayAll) {
      columns = Object.keys(row)
        .filter(column => column.match('^(?!validationState).*'));

    } else { // display only fields inside the content object
      columns = Object.keys(row)
        .filter(column => {
          return (column.match('^content.(?!core).*') &&
            !column.match('describedBy') &&
            !column.match('schema_version') &&
            !column.match('[\[]')); // exclude metadata attributes which are of list type
        });
    }

    if (this.config && this.config.displayContent) {
      columns.unshift('content.core.type');
    }

    if (this.config && this.config.displayColumns) {
      columns = columns.concat(this.config.displayColumns);
    }

    return columns;
  }

  getMetadataType(rowIndex) {
    const row = this.metadataList[rowIndex];
    const schemaId = row && row['content'] ? row['content']['describedBy'] : '';

    if (!schemaId) {
      return 'unknown';
    }

    const type = schemaId.split('/').pop();
    this.metadataList[rowIndex]['metadataType'] = type;

    return type;
  }

  getDefaultValidMessage() {
    let validMessage = '* Metadata is valid.';

    if (this.metadataType === 'files') {
      validMessage = '* Data is valid.';
    }

    return validMessage;
  }

  updateValue(event, cell, rowIndex) {
    console.log('inline editing rowIndex', rowIndex);
    this.editing[rowIndex + '-' + cell] = false;

    const oldValue = this.rows[rowIndex][cell];
    const newValue = event.target.value;

    console.log('newValue', newValue);

    this.rows[rowIndex][cell] = newValue;
    this.rows = [...this.rows];

    console.log('METADATA LIST ROW!', this.metadataList[rowIndex]);
    console.log('ROWS!', this.rows);
  }

  getValidationErrors(row) {
    const columns = Object.keys(row)
      .filter(column => {
        return (column.match('^validationErrors.+userFriendlyMessage') || column.match('^validationErrors.+user_friendly_message'));
      });
    const errors = [];
    const count = columns.length;
    for (let i = 0; i < count; i++) {
      errors.push(`* ${row[columns[i]]}`);
    }
    return errors;
  }

  expandAllRows() {
    this.table.rowDetail.expandAllRows();
    this.expandAll = true;
  }

  collapseAllRows() {
    this.table.rowDetail.collapseAllRows();
    this.expandAll = false;
  }

  setPage(pageInfo) {
    this.currentPageInfo = pageInfo;
    this.stopPolling();
    this.page.number = pageInfo.offset;
    this.startPolling(this.currentPageInfo);
    this.alive = true;
  }


  fetchData(pageInfo) {

    if (this.submissionEnvelopeId) {
      const params = {
        page: pageInfo['offset'],
        size: pageInfo['size'],
        sort: pageInfo['sort']
      };

      this.metadataList$ = this.ingestService.fetchSubmissionData(this.submissionEnvelopeId, this.metadataType, this.filterState, params);
      this.metadataList$.subscribe(data => {
        this.rows = data.data.map(this.flattenService.flatten);
        this.metadataList = data.data;
        if (data.page) {
          this.isPaginated = true;
          this.page = data.page;
        } else {
          this.isPaginated = false;
        }
      });
    }
  }

  startPolling(pageInfo) {
    this.pollingSubscription = this.pollingTimer.subscribe(() => {
      this.fetchData(pageInfo);
    });

  }

  stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  filterByState(event) {
    const filterState = event.value;
    this.filterState = filterState;
    this.setPage(this.currentPageInfo);
  }

  showFilterState() {
    return this.metadataType !== 'bundleManifests';
  }

  onSort(event) {
    const sorts = event.sorts;

    const column = sorts[0]['prop']; // only one column sorting is supported for now
    const dir = sorts[0]['dir'];

    if (this.metadataType === 'files') { // only sorting in files are supported for now
      this.currentPageInfo['sort'] = {column: column, dir: dir};
      this.setPage(this.currentPageInfo);
    }

  }

  getRowId(row) {
    return row['uuid.uuid'];
  }
}
