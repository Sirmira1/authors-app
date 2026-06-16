import { Component, ElementRef, HostListener, Inject, NgZone, PLATFORM_ID, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Job, JobService } from '../job';

type SortKey = 'job_id' | 'job_desc' | 'min_lvl' | 'max_lvl';
type SortDirection = 'asc' | 'desc';

interface SavedView {
  name: string;
  searchTerm: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

@Component({
  selector: 'app-job-list',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './job-list.html',
  styleUrl: './job-list.scss'
})
export class JobListComponent implements OnInit {
  private readonly savedViewsKey = 'job-list-saved-views';
  private readonly manualPageSizeKey = 'job-list-manual-page-size';
  private successMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('deleteWarningBanner') deleteWarningBanner?: ElementRef<HTMLElement>;
  @ViewChild('successBanner') successBanner?: ElementRef<HTMLElement>;

  jobs: Job[] = [];
  viewJobs: Job[] = [];
  deleteWarning: string | null = null;
  successMessage: string | null = null;
  searchTerm = '';
  draftSearchTerm = '';
  draftSortKey: SortKey = 'job_desc';
  draftSortDirection: SortDirection = 'asc';
  savedViews: SavedView[] = [];
  selectedSavedViewName = '';
  newSavedViewName = '';
  sortKey: SortKey = 'job_desc';
  sortDirection: SortDirection = 'asc';
  pageSize = 10;
  autoFitPageSize = 10;
  manualPageSize: number | null = null;
  readonly pageSizeOptions = [5, 10, 15, 20, 25, 50];
  currentPage = 1;

  constructor(
    private jobService: JobService,
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
    this.loadJobs();
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

  loadJobs() {
    this.jobService.getJobs().subscribe({
      next: jobs => {
        this.ngZone.run(() => {
          this.jobs = jobs;
          this.recomputeViewJobs();
          this.ensureCurrentPageInBounds();
        });
      },
      error: err => console.error('Error loading jobs', err)
    });
  }

  deleteJob(id: number): void {
    const confirmed = confirm('Are you sure you want to delete this job?');
    if (confirmed) {
      this.deleteWarning = null;
      this.jobService.deleteJob(id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.deleteWarning = null;
            this.jobs = this.jobs.filter(job => job.job_id !== id);
            this.recomputeViewJobs();
            this.ensureCurrentPageInBounds();
            this.setSuccessMessage('Job deleted successfully.');
          });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.deleteWarning = err.error?.error || 'This job cannot be deleted because it is assigned to one or more employees.';
            this.scrollToDeleteWarning();
            return;
          }

          this.deleteWarning = 'Unable to delete this job right now. Please try again.';
          this.scrollToDeleteWarning();
          console.error('Error deleting job', err);
        }
      });
    }
  }

  applySearch(): void {
    this.searchTerm = this.draftSearchTerm;
    this.sortKey = this.draftSortKey;
    this.sortDirection = this.draftSortDirection;
    this.recomputeViewJobs();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  clearFilters(): void {
    this.draftSearchTerm = '';
    this.searchTerm = '';
    this.selectedSavedViewName = '';
    this.recomputeViewJobs();
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
    this.sortKey = selectedView.sortKey;
    this.sortDirection = selectedView.sortDirection;
    this.draftSearchTerm = selectedView.searchTerm;
    this.draftSortKey = selectedView.sortKey;
    this.draftSortDirection = selectedView.sortDirection;
    this.recomputeViewJobs();
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

  sortByHeader(sortKey: SortKey): void {
    if (this.sortKey === sortKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = sortKey;
      this.sortDirection = 'asc';
    }

    this.draftSortKey = this.sortKey;
    this.draftSortDirection = this.sortDirection;
    this.recomputeViewJobs();
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

  trackByJobId(_index: number, job: Job): number {
    return job.job_id;
  }

  get pagedJobs(): Job[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.viewJobs.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    if (this.viewJobs.length === 0) {
      return 1;
    }

    return Math.ceil(this.viewJobs.length / this.pageSize);
  }

  get pageStartItem(): number {
    if (this.viewJobs.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEndItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.viewJobs.length);
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

  private getComparableValue(job: Job, key: SortKey): string | number {
    if (key === 'min_lvl' || key === 'max_lvl' || key === 'job_id') {
      return job[key] ?? 0;
    }

    return (job[key] ?? '').toString().toLowerCase();
  }

  private recomputeViewJobs(): void {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    const filtered = this.jobs.filter(job => {
      return !normalizedTerm || this.matchesSearch(job, normalizedTerm);
    });

    this.viewJobs = filtered.sort((a, b) => {
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

  private matchesSearch(job: Job, normalizedTerm: string): boolean {
    const valuesToSearch = [
      job.job_id,
      job.job_desc,
      job.min_lvl,
      job.max_lvl
    ];

    return valuesToSearch.some(value => (value ?? '').toString().toLowerCase().includes(normalizedTerm));
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
      this.setSuccessMessage('Job created successfully.');
    }

    if (successAction === 'updated') {
      this.setSuccessMessage('Job updated successfully.');
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
