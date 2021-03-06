import {Component, Input, OnInit} from '@angular/core';
import {Project, ProjectColumn} from '../../models/project';
import {$enum} from 'ts-enum-util';
import {formatDate} from '@angular/common';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
  constructor() {
  }

  private _projects: Project[];

  get projects(): Project[] {
    return this._projects;
  }

  @Input()
  set projects(projects: Project[]) {
    this._projects = projects;
  }

  private _columns: ProjectColumn[];

  get columns(): ProjectColumn[] {
    return this._columns;
  }

  @Input()
  set columns(columns: ProjectColumn[]) {
    this._columns = columns;
  }

  private _showUnassignedActions: Boolean = false;

  get showUnassignedActions(): Boolean {
    return this._showUnassignedActions;
  }

  @Input()
  set showUnassignedActions(showUnassignedActions: Boolean) {
    this._showUnassignedActions = showUnassignedActions;
  }

  ngOnInit() {
  }

  getColumnLabel(column: ProjectColumn): string {
    return $enum.mapValue(column).with({
      [ProjectColumn.api_link]: '',
      [ProjectColumn.short_name]: 'HCA Project ID',
      [ProjectColumn.project_title]: 'Project Title',
      [ProjectColumn.last_updated]: 'Last Updated',
      [ProjectColumn.primary_contributor]: 'Primary Contributor',
      [ProjectColumn.primary_wrangler]: 'Primary Wrangler'
    });
  }

  getContent(column: ProjectColumn, project: Project): string {
    return $enum.mapValue(column).with({
      [ProjectColumn.api_link]: this.getApiLink(project),
      [ProjectColumn.short_name]: this.getShortName(project),
      [ProjectColumn.project_title]: this.getTitle(project),
      [ProjectColumn.last_updated]: this.getLastUpdated(project),
      [ProjectColumn.primary_contributor]: this.getContributor(project),
      [ProjectColumn.primary_wrangler]: 'Wrangler Name'
      // ToDo: Include Wrangler and User Account objects in ingest-core Project object.
    });
  }

  getApiLink(project: Project) {
    try {
      return project['_links']['self']['href'];
    } catch (e) {
      return '';
    }
  }

  getShortName(project: Project): string {
    try {
      return project?.content['project_core']['project_short_name'];
    } catch (e) {
      return '';
    }
  }

  getTitle(project: Project): string {
    try {
      return project?.content['project_core']['project_title'];
    } catch (e) {
      return '';
    }
  }

  getLastUpdated(project: Project): string {
    return formatDate(project.updateDate, 'longDate', 'en-GB');
  }

  getContributor(project: Project) {
    let contributors = project && project.content && project.content['contributors'];
    contributors = contributors ? project.content['contributors'] : [];
    const correspondents = contributors.filter(contributor => contributor['corresponding_contributor'] === true);
    return correspondents.map(c => c['name']).join(' | ');
  }
}
