import { Component, ElementRef, HostListener, Inject, NgZone, PLATFORM_ID, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Publisher, PublisherService } from '../publisher';

type SortKey = 'pub_id' | 'pub_name' | 'city' | 'state' | 'country';
type SortDirection = 'asc' | 'desc';

interface SavedView {
  name: string;
  searchTerm: string;
  city: string;
  state: string;
  country: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

@Component({
  selector: 'app-publisher-list',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './publisher-list.html',
  styleUrl: './publisher-list.scss'
})
export class PublisherListComponent implements OnInit {
  private readonly savedViewsKey = 'publisher-list-saved-views';
  private readonly manualPageSizeKey = 'publisher-list-manual-page-size';
  private successMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('deleteWarningBanner') deleteWarningBanner?: ElementRef<HTMLElement>;
  @ViewChild('successBanner') successBanner?: ElementRef<HTMLElement>;

  publishers: Publisher[] = [];
  viewPublishers: Publisher[] = [];
  deleteWarning: string | null = null;
  successMessage: string | null = null;
  searchTerm = '';
  cityFilter = '';
  stateFilter = '';
  countryFilter = '';
  draftSearchTerm = '';
  draftCityFilter = '';
  draftStateFilter = '';
  draftCountryFilter = '';
  draftSortKey: SortKey = 'pub_name';
  draftSortDirection: SortDirection = 'asc';
  savedViews: SavedView[] = [];
  selectedSavedViewName = '';
  newSavedViewName = '';
  sortKey: SortKey = 'pub_name';
  sortDirection: SortDirection = 'asc';
  pageSize = 10;
  autoFitPageSize = 10;
  manualPageSize: number | null = null;
  readonly pageSizeOptions = [5, 10, 15, 20, 25, 50];
  currentPage = 1;

  constructor(
    private publisherService: PublisherService,
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
    this.loadPublishers();
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

  loadPublishers() {
    this.publisherService.getPublishers().subscribe({
      next: publishers => {
        this.ngZone.run(() => {
          this.publishers = publishers;
          this.recomputeViewPublishers();
          this.ensureCurrentPageInBounds();
        });
      },
      error: err => console.error('Error loading publishers', err)
    });
  }

  openPublisher(id: string) : void {
    window.open(`/publishers/${id}`, '_blank');
  }

  deletePublisher(id: string): void {
    const confirmed = confirm('Are you sure you want to delete this publisher?');
    if (confirmed) {
      this.deleteWarning = null;
      this.publisherService.deletePublisher(id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.deleteWarning = null;
            this.publishers = this.publishers.filter(publisher => publisher.pub_id !== id);
            this.recomputeViewPublishers();
            this.ensureCurrentPageInBounds();
            this.setSuccessMessage('Publisher deleted successfully.');
          });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.deleteWarning = err.error?.error || 'This publisher cannot be deleted because it is linked to one or more titles or employees.';
            this.scrollToDeleteWarning();
            return;
          }

          this.deleteWarning = 'Unable to delete this publisher right now. Please try again.';
          this.scrollToDeleteWarning();
          console.error('Error deleting publisher', err);
        }
      });
    }
  }

  applySearch(): void {
    this.searchTerm = this.draftSearchTerm;
    this.cityFilter = this.draftCityFilter;
    this.stateFilter = this.draftStateFilter;
    this.countryFilter = this.draftCountryFilter;
    this.sortKey = this.draftSortKey;
    this.sortDirection = this.draftSortDirection;
    this.recomputeViewPublishers();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  clearFilters(): void {
    this.draftSearchTerm = '';
    this.draftCityFilter = '';
    this.draftStateFilter = '';
    this.draftCountryFilter = '';
    this.searchTerm = '';
    this.cityFilter = '';
    this.stateFilter = '';
    this.countryFilter = '';
    this.selectedSavedViewName = '';
    this.recomputeViewPublishers();
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
      city: this.cityFilter,
      state: this.stateFilter,
      country: this.countryFilter,
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
    this.cityFilter = selectedView.city;
    this.stateFilter = selectedView.state;
    this.countryFilter = selectedView.country;
    this.sortKey = selectedView.sortKey;
    this.sortDirection = selectedView.sortDirection;
    this.draftSearchTerm = selectedView.searchTerm;
    this.draftCityFilter = selectedView.city;
    this.draftStateFilter = selectedView.state;
    this.draftCountryFilter = selectedView.country;
    this.draftSortKey = selectedView.sortKey;
    this.draftSortDirection = selectedView.sortDirection;
    this.recomputeViewPublishers();
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

  get cityOptions(): string[] {
    return this.getDistinctValues(this.publishers.map(publisher => publisher.city));
  }

  get stateOptions(): string[] {
    return this.getDistinctValues(this.publishers.map(publisher => publisher.state));
  }

  get countryOptions(): string[] {
    return this.getDistinctValues(this.publishers.map(publisher => publisher.country));
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
    this.recomputeViewPublishers();
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

  trackByPublisherId(_index: number, publisher: Publisher): string {
    return publisher.pub_id;
  }

  get pagedPublishers(): Publisher[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.viewPublishers.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    if (this.viewPublishers.length === 0) {
      return 1;
    }

    return Math.ceil(this.viewPublishers.length / this.pageSize);
  }

  get pageStartItem(): number {
    if (this.viewPublishers.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEndItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.viewPublishers.length);
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

  private getComparableValue(publisher: Publisher, key: SortKey): string | number {
    return (publisher[key] ?? '').toString().toLowerCase();
  }

  private recomputeViewPublishers(): void {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();
    const normalizedCity = this.cityFilter.trim().toLowerCase();
    const normalizedState = this.stateFilter.trim().toLowerCase();
    const normalizedCountry = this.countryFilter.trim().toLowerCase();
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    const filtered = this.publishers.filter(publisher => {
      const matchesTerm = !normalizedTerm || this.matchesSearch(publisher, normalizedTerm);
      const matchesCity = !normalizedCity || (publisher.city ?? '').toLowerCase() === normalizedCity;
      const matchesState = !normalizedState || (publisher.state ?? '').toLowerCase() === normalizedState;
      const matchesCountry = !normalizedCountry || (publisher.country ?? '').toLowerCase() === normalizedCountry;

      return matchesTerm && matchesCity && matchesState && matchesCountry;
    });

    this.viewPublishers = filtered.sort((a, b) => {
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

  private matchesSearch(publisher: Publisher, normalizedTerm: string): boolean {
    const valuesToSearch = [
      publisher.pub_id,
      publisher.pub_name,
      publisher.city,
      publisher.state,
      publisher.country
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
      this.setSuccessMessage('Publisher created successfully.');
    }

    if (successAction === 'updated') {
      this.setSuccessMessage('Publisher updated successfully.');
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
