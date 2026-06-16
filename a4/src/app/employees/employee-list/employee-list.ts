import { Component, ElementRef, HostListener, Inject, NgZone, PLATFORM_ID, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Employee, EmployeeService } from '../employee';

type SortKey = 'emp_id' | 'lname' | 'fname' | 'job_desc' | 'job_lvl' | 'pub_name' | 'hire_date';
type SortDirection = 'asc' | 'desc';

interface SavedView {
  name: string;
  searchTerm: string;
  job: string;
  publisher: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

@Component({
  selector: 'app-employee-list',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss'
})
export class EmployeeListComponent implements OnInit {
  private readonly savedViewsKey = 'employee-list-saved-views';
  private readonly manualPageSizeKey = 'employee-list-manual-page-size';
  private successMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('deleteWarningBanner') deleteWarningBanner?: ElementRef<HTMLElement>;
  @ViewChild('successBanner') successBanner?: ElementRef<HTMLElement>;

  employees: Employee[] = [];
  viewEmployees: Employee[] = [];
  deleteWarning: string | null = null;
  successMessage: string | null = null;
  searchTerm = '';
  jobFilter = '';
  publisherFilter = '';
  draftSearchTerm = '';
  draftJobFilter = '';
  draftPublisherFilter = '';
  draftSortKey: SortKey = 'lname';
  draftSortDirection: SortDirection = 'asc';
  savedViews: SavedView[] = [];
  selectedSavedViewName = '';
  newSavedViewName = '';
  sortKey: SortKey = 'lname';
  sortDirection: SortDirection = 'asc';
  pageSize = 10;
  autoFitPageSize = 10;
  manualPageSize: number | null = null;
  readonly pageSizeOptions = [5, 10, 15, 20, 25, 50];
  currentPage = 1;

  constructor(
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.updatePageSizeForViewport();
  }

  ngOnInit(): void {
    this.consumeSuccessQueryParam();
    this.loadManualPageSizePreference();
    this.loadSavedViews();
    this.loadEmployees();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.manualPageSize === null) {
      this.updatePageSizeForViewport();
    }
  }

  onManualPageSizeChange(value: string): void {
    if (value === 'auto') {
      this.manualPageSize = null;
      this.persistManualPageSizePreference();
      this.updatePageSizeForViewport();
    } else {
      this.manualPageSize = Number(value);
      this.pageSize = this.manualPageSize;
      this.persistManualPageSizePreference();
    }
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  loadEmployees() {
    this.employeeService.getEmployees().subscribe({
      next: employees => {
        this.ngZone.run(() => {
          this.employees = employees;
          this.recomputeViewEmployees();
          this.ensureCurrentPageInBounds();
        });
      },
      error: err => console.error('Error loading employees', err)
    });
  }

  deleteEmployee(id: string): void {
    const confirmed = confirm('Are you sure you want to delete this employee?');
    if (confirmed) {
      this.deleteWarning = null;
      this.employeeService.deleteEmployee(id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.deleteWarning = null;
            this.employees = this.employees.filter(employee => employee.emp_id !== id);
            this.recomputeViewEmployees();
            this.ensureCurrentPageInBounds();
            this.setSuccessMessage('Employee deleted successfully.');
          });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.deleteWarning = err.error?.error || 'This employee cannot be deleted because it is linked to other records.';
            this.scrollToDeleteWarning();
            return;
          }

          this.deleteWarning = 'Unable to delete this employee right now. Please try again.';
          this.scrollToDeleteWarning();
          console.error('Error deleting employee', err);
        }
      });
    }
  }

  applySearch(): void {
    this.searchTerm = this.draftSearchTerm;
    this.jobFilter = this.draftJobFilter;
    this.publisherFilter = this.draftPublisherFilter;
    this.sortKey = this.draftSortKey;
    this.sortDirection = this.draftSortDirection;
    this.recomputeViewEmployees();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  clearFilters(): void {
    this.draftSearchTerm = '';
    this.draftJobFilter = '';
    this.draftPublisherFilter = '';
    this.searchTerm = '';
    this.jobFilter = '';
    this.publisherFilter = '';
    this.selectedSavedViewName = '';
    this.recomputeViewEmployees();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  saveCurrentView(): void {
    const trimmedName = this.newSavedViewName.trim();

    if (!trimmedName) {
      return;
    }

    const view: SavedView = {
      name: trimmedName,
      searchTerm: this.searchTerm,
      job: this.jobFilter,
      publisher: this.publisherFilter,
      sortKey: this.sortKey,
      sortDirection: this.sortDirection
    };

    this.savedViews = [
      ...this.savedViews.filter(existing => existing.name.toLowerCase() !== trimmedName.toLowerCase()),
      view
    ].sort((a, b) => a.name.localeCompare(b.name));

    this.persistSavedViews();
    this.newSavedViewName = '';
  }

  applySavedView(name: string): void {
    const selectedView = this.savedViews.find(view => view.name === name);

    if (!selectedView) {
      return;
    }

    this.searchTerm = selectedView.searchTerm;
    this.jobFilter = selectedView.job;
    this.publisherFilter = selectedView.publisher;
    this.sortKey = selectedView.sortKey;
    this.sortDirection = selectedView.sortDirection;
    this.draftSearchTerm = selectedView.searchTerm;
    this.draftJobFilter = selectedView.job;
    this.draftPublisherFilter = selectedView.publisher;
    this.draftSortKey = selectedView.sortKey;
    this.draftSortDirection = selectedView.sortDirection;
    this.recomputeViewEmployees();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  onSavedViewSelectionChange(name: string): void {
    this.selectedSavedViewName = name;

    if (!name) {
      this.clearFilters();
    }
  }

  deleteSavedView(name: string): void {
    this.savedViews = this.savedViews.filter(view => view.name !== name);
    if (this.selectedSavedViewName === name) {
      this.selectedSavedViewName = '';
    }
    this.persistSavedViews();
  }

  get highlightedSearchTerm(): string {
    return this.searchTerm.trim();
  }

  get jobOptions(): string[] {
    return this.getDistinctValues(this.employees.map(employee => employee.job_desc ?? ''));
  }

  get publisherOptions(): string[] {
    return this.getDistinctValues(this.employees.map(employee => employee.pub_name ?? ''));
  }

  getHighlightedText(value: unknown): string {
    const escapedValue = this.escapeHtml((value ?? '').toString());
    const term = this.highlightedSearchTerm;

    if (!term) {
      return escapedValue;
    }

    const escapedTerm = this.escapeRegExp(term);
    const searchRegExp = new RegExp(`(${escapedTerm})`, 'ig');
    return escapedValue.replace(searchRegExp, '<mark>$1</mark>');
  }

  getFullName(employee: Employee): string {
    return [employee.fname, employee.minit, employee.lname].filter(part => part && part.toString().trim()).join(' ');
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  }

  sortByHeader(sortKey: SortKey): void {
    if (this.sortKey === sortKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = sortKey;
      this.sortDirection = 'asc';
    }

    this.draftSortKey = this.sortKey;
    this.draftSortDirection = this.sortDirection;
    this.recomputeViewEmployees();
    this.currentPage = 1;
  }

  isActiveSort(sortKey: SortKey): boolean {
    return this.sortKey === sortKey;
  }

  getSortIndicator(sortKey: SortKey): string {
    if (this.sortKey !== sortKey) {
      return '↕';
    }

    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  trackByEmployeeId(_index: number, employee: Employee): string {
    return employee.emp_id;
  }

  get pagedEmployees(): Employee[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.viewEmployees.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    if (this.viewEmployees.length === 0) {
      return 1;
    }

    return Math.ceil(this.viewEmployees.length / this.pageSize);
  }

  get pageStartItem(): number {
    if (this.viewEmployees.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEndItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.viewEmployees.length);
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  private ensureCurrentPageInBounds(): void {
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  private updatePageSizeForViewport(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.autoFitPageSize = 10;
      if (this.manualPageSize === null) {
        this.pageSize = 10;
      }
      this.ensureCurrentPageInBounds();
      return;
    }

    const viewportHeight = window.innerHeight;
    const reservedHeight = 420;
    const estimatedRowHeight = 35;
    const availableForRows = Math.max(viewportHeight - reservedHeight, estimatedRowHeight * 5);
    const computed = Math.floor(availableForRows / estimatedRowHeight);

    this.autoFitPageSize = Math.max(5, Math.min(12, computed));
    if (this.manualPageSize === null) {
      this.pageSize = this.autoFitPageSize;
    }
    this.ensureCurrentPageInBounds();
  }

  private getComparableValue(employee: Employee, key: SortKey): string | number {
    if (key === 'job_lvl') {
      return employee.job_lvl ?? -1;
    }

    if (key === 'hire_date') {
      const time = new Date(employee.hire_date).getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    return (employee[key] ?? '').toString().toLowerCase();
  }

  private recomputeViewEmployees(): void {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();
    const normalizedJob = this.jobFilter.trim().toLowerCase();
    const normalizedPublisher = this.publisherFilter.trim().toLowerCase();
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    const filtered = this.employees.filter(employee => {
      const matchesTerm = !normalizedTerm || this.matchesSearch(employee, normalizedTerm);
      const matchesJob = !normalizedJob || (employee.job_desc ?? '').toLowerCase() === normalizedJob;
      const matchesPublisher = !normalizedPublisher || (employee.pub_name ?? '').toLowerCase() === normalizedPublisher;

      return matchesTerm && matchesJob && matchesPublisher;
    });

    this.viewEmployees = filtered.sort((a, b) => {
      const aValue = this.getComparableValue(a, this.sortKey);
      const bValue = this.getComparableValue(b, this.sortKey);

      if (aValue < bValue) {
        return -1 * direction;
      }

      if (aValue > bValue) {
        return 1 * direction;
      }

      return 0;
    });
  }

  private matchesSearch(employee: Employee, normalizedTerm: string): boolean {
    const valuesToSearch = [
      employee.emp_id,
      employee.fname,
      employee.minit,
      employee.lname,
      employee.job_desc,
      employee.job_lvl,
      employee.pub_name
    ];

    return valuesToSearch.some(value => (value ?? '').toString().toLowerCase().includes(normalizedTerm));
  }

  private getDistinctValues(values: string[]): string[] {
    const normalized = values
      .map(value => (value ?? '').trim())
      .filter(value => value.length > 0);

    return [...new Set(normalized)].sort((a, b) => a.localeCompare(b));
  }

  private persistSavedViews(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(this.savedViewsKey, JSON.stringify(this.savedViews));
  }

  private loadSavedViews(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const rawValue = localStorage.getItem(this.savedViewsKey);

    if (!rawValue) {
      this.savedViews = [];
      return;
    }

    try {
      const parsed = JSON.parse(rawValue) as SavedView[];
      this.savedViews = Array.isArray(parsed)
        ? parsed.filter(view => typeof view?.name === 'string' && view.name.trim().length > 0)
        : [];
    } catch {
      this.savedViews = [];
    }
  }

  private persistManualPageSizePreference(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.manualPageSize === null) {
      localStorage.removeItem(this.manualPageSizeKey);
      return;
    }

    localStorage.setItem(this.manualPageSizeKey, this.manualPageSize.toString());
  }

  private loadManualPageSizePreference(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const rawValue = localStorage.getItem(this.manualPageSizeKey);

    if (!rawValue) {
      this.manualPageSize = null;
      this.updatePageSizeForViewport();
      return;
    }

    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      this.manualPageSize = null;
      localStorage.removeItem(this.manualPageSizeKey);
      this.updatePageSizeForViewport();
      return;
    }

    this.manualPageSize = parsed;
    this.pageSize = parsed;
    this.ensureCurrentPageInBounds();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private consumeSuccessQueryParam(): void {
    const successAction = this.route.snapshot.queryParamMap.get('success');

    if (!successAction) {
      return;
    }

    if (successAction === 'created') {
      this.setSuccessMessage('Employee created successfully.');
    }

    if (successAction === 'updated') {
      this.setSuccessMessage('Employee updated successfully.');
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  private setSuccessMessage(message: string): void {
    this.successMessage = message;
    this.scrollToSuccessMessage();

    if (this.successMessageTimeoutId) {
      clearTimeout(this.successMessageTimeoutId);
    }

    this.successMessageTimeoutId = setTimeout(() => {
      this.successMessage = null;
      this.successMessageTimeoutId = null;
    }, 4000);
  }

  private scrollToSuccessMessage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      const banner = this.successBanner?.nativeElement;

      if (!banner) {
        return;
      }

      banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      banner.focus({ preventScroll: true });
    }, 0);
  }

  private scrollToDeleteWarning(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      const warning = this.deleteWarningBanner?.nativeElement;

      if (!warning) {
        return;
      }

      warning.scrollIntoView({ behavior: 'smooth', block: 'center' });
      warning.focus({ preventScroll: true });
    }, 0);
  }
}
