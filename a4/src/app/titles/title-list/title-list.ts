import { Component, ElementRef, HostListener, Inject, NgZone, PLATFORM_ID, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Title, TitleService } from '../title';
import { ListStatsComponent, type Stat } from '../../shared/list-stats.component';

type SortKey = 'title_id' | 'title' | 'type' | 'pub_name' | 'price' | 'ytd_sales' | 'pubdate';
type SortDirection = 'asc' | 'desc';

interface SavedView {
  name: string;
  searchTerm: string;
  type: string;
  publisher: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

@Component({
  selector: 'app-title-list',
  imports: [RouterLink, CommonModule, FormsModule, ListStatsComponent],
  templateUrl: './title-list.html',
  styleUrl: './title-list.scss'
})
export class TitleListComponent implements OnInit {
  private readonly savedViewsKey = 'title-list-saved-views';
  private readonly manualPageSizeKey = 'title-list-manual-page-size';
  private successMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('deleteWarningBanner') deleteWarningBanner?: ElementRef<HTMLElement>;
  @ViewChild('successBanner') successBanner?: ElementRef<HTMLElement>;

  titles: Title[] = [];
  viewTitles: Title[] = [];
  deleteWarning: string | null = null;
  successMessage: string | null = null;
  searchTerm = '';
  typeFilter = '';
  publisherFilter = '';
  draftSearchTerm = '';
  draftTypeFilter = '';
  draftPublisherFilter = '';
  draftSortKey: SortKey = 'title';
  draftSortDirection: SortDirection = 'asc';
  savedViews: SavedView[] = [];
  selectedSavedViewName = '';
  newSavedViewName = '';
  sortKey: SortKey = 'title';
  sortDirection: SortDirection = 'asc';
  pageSize = 10;
  autoFitPageSize = 10;
  manualPageSize: number | null = null;
  readonly pageSizeOptions = [5, 10, 15, 20, 25, 50];
  currentPage = 1;

  constructor(
    private titleService: TitleService,
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
    this.loadTitles();
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

  loadTitles() {
    this.titleService.getTitles().subscribe({
      next: titles => {
        this.ngZone.run(() => {
          this.titles = titles;
          this.recomputeViewTitles();
          this.ensureCurrentPageInBounds();
        });
      },
      error: err => console.error('Error loading titles', err)
    });
  }

  deleteTitle(id: string): void {
    const confirmed = confirm('Are you sure you want to delete this title?');
    if (confirmed) {
      this.deleteWarning = null;
      this.titleService.deleteTitle(id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.deleteWarning = null;
            this.titles = this.titles.filter(title => title.title_id !== id);
            this.recomputeViewTitles();
            this.ensureCurrentPageInBounds();
            this.setSuccessMessage('Title deleted successfully.');
          });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.deleteWarning = err.error?.error || 'This title cannot be deleted because it is linked to sales or author records.';
            this.scrollToDeleteWarning();
            return;
          }

          this.deleteWarning = 'Unable to delete this title right now. Please try again.';
          this.scrollToDeleteWarning();
          console.error('Error deleting title', err);
        }
      });
    }
  }

  applySearch(): void {
    this.searchTerm = this.draftSearchTerm;
    this.typeFilter = this.draftTypeFilter;
    this.publisherFilter = this.draftPublisherFilter;
    this.sortKey = this.draftSortKey;
    this.sortDirection = this.draftSortDirection;
    this.recomputeViewTitles();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  clearFilters(): void {
    this.draftSearchTerm = '';
    this.draftTypeFilter = '';
    this.draftPublisherFilter = '';
    this.searchTerm = '';
    this.typeFilter = '';
    this.publisherFilter = '';
    this.selectedSavedViewName = '';
    this.recomputeViewTitles();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  exportToExcel(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.viewTitles.length === 0) {
      this.setSuccessMessage('No titles to export for the current filters.');
      return;
    }

    const headers = ['Title ID', 'Title', 'Type', 'Publisher', 'Price', 'YTD Sales', 'Publish Date'];
    const rows = this.viewTitles.map((title) => [
      title.title_id,
      title.title,
      title.type,
      title.pub_name ?? '',
      title.price ?? '',
      title.ytd_sales ?? '',
      title.pubdate,
    ]);

    const csvLines = [headers, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.setAttribute('download', `titles-export-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.setSuccessMessage('Titles exported successfully (Excel-compatible CSV).');
  }

  saveCurrentView(): void {
    const trimmedName = this.newSavedViewName.trim();

    if (!trimmedName) {
      return;
    }

    const view: SavedView = {
      name: trimmedName,
      searchTerm: this.searchTerm,
      type: this.typeFilter,
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
    this.typeFilter = selectedView.type;
    this.publisherFilter = selectedView.publisher;
    this.sortKey = selectedView.sortKey;
    this.sortDirection = selectedView.sortDirection;
    this.draftSearchTerm = selectedView.searchTerm;
    this.draftTypeFilter = selectedView.type;
    this.draftPublisherFilter = selectedView.publisher;
    this.draftSortKey = selectedView.sortKey;
    this.draftSortDirection = selectedView.sortDirection;
    this.recomputeViewTitles();
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

  get typeOptions(): string[] {
    return this.getDistinctValues(this.titles.map(title => title.type));
  }

  get publisherOptions(): string[] {
    return this.getDistinctValues(this.titles.map(title => title.pub_name ?? ''));
  }

  get listStats(): Stat[] {
    return [
      { label: 'Total titles', value: this.titles.length },
      { label: 'Showing', value: `${this.viewTitles.length} / ${this.titles.length}` },
      { label: 'Current page', value: `${this.currentPage} / ${this.totalPages}` },
    ];
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

  formatMoney(value: number | null): string {
    if (value === null || value === undefined) {
      return '—';
    }

    return `$${Number(value).toFixed(2)}`;
  }

  formatType(value: string | null | undefined): string {
    const raw = (value ?? '').trim();

    if (!raw) {
      return '—';
    }

    const knownLabels: Record<string, string> = {
      business: 'Business',
      mod_cook: 'Modern Cooking',
      trad_cook: 'Traditional Cooking',
      popular_comp: 'Popular Computing',
      psychology: 'Psychology',
      undecided: 'Undecided'
    };

    const mapped = knownLabels[raw.toLowerCase()];
    if (mapped) {
      return mapped;
    }

    return raw
      .split(/[_\s]+/)
      .filter(part => part.length > 0)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
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
    this.recomputeViewTitles();
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

  getAriaSort(sortKey: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.sortKey !== sortKey) {
      return 'none';
    }

    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  trackByTitleId(_index: number, title: Title): string {
    return title.title_id;
  }

  get pagedTitles(): Title[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.viewTitles.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    if (this.viewTitles.length === 0) {
      return 1;
    }

    return Math.ceil(this.viewTitles.length / this.pageSize);
  }

  get pageStartItem(): number {
    if (this.viewTitles.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEndItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.viewTitles.length);
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

  private getComparableValue(title: Title, key: SortKey): string | number {
    if (key === 'price' || key === 'ytd_sales') {
      return title[key] ?? -1;
    }

    if (key === 'pubdate') {
      const time = new Date(title.pubdate).getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    return (title[key] ?? '').toString().toLowerCase();
  }

  private recomputeViewTitles(): void {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();
    const normalizedType = this.typeFilter.trim().toLowerCase();
    const normalizedPublisher = this.publisherFilter.trim().toLowerCase();
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    const filtered = this.titles.filter(title => {
      const matchesTerm = !normalizedTerm || this.matchesSearch(title, normalizedTerm);
      const matchesType = !normalizedType || (title.type ?? '').toLowerCase() === normalizedType;
      const matchesPublisher = !normalizedPublisher || (title.pub_name ?? '').toLowerCase() === normalizedPublisher;

      return matchesTerm && matchesType && matchesPublisher;
    });

    this.viewTitles = filtered.sort((a, b) => {
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

  private matchesSearch(title: Title, normalizedTerm: string): boolean {
    const valuesToSearch = [
      title.title_id,
      title.title,
      title.type,
      this.formatType(title.type),
      title.pub_name,
      title.price,
      title.ytd_sales,
      title.notes
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

  private escapeCsv(value: unknown): string {
    const text = (value ?? '').toString();
    return `"${text.replace(/"/g, '""')}"`;
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
      this.setSuccessMessage('Title created successfully.');
    }

    if (successAction === 'updated') {
      this.setSuccessMessage('Title updated successfully.');
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
