import { Component, ElementRef, HostListener, Inject, NgZone, PLATFORM_ID, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Author, AuthorService } from '../author';
import { ListStatsComponent, type Stat } from '../../shared/list-stats.component';

type SortKey = 'au_id' | 'au_fname' | 'au_lname' | 'phone' | 'address' | 'city' | 'state' | 'zip' | 'contract';
type SortDirection = 'asc' | 'desc';
type ContractFilter = 'all' | 'yes' | 'no';

interface SavedView {
  name: string;
  searchTerm: string;
  city: string;
  state: string;
  contract: ContractFilter;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

@Component({
  selector: 'app-author-list',
  imports: [RouterLink, CommonModule, FormsModule, ListStatsComponent],
  templateUrl: './author-list.html',
  styleUrl: './author-list.scss'
})
export class AuthorListComponent implements OnInit {
  private readonly savedViewsKey = 'author-list-saved-views';
  private readonly manualPageSizeKey = 'author-list-manual-page-size';
  private successMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('deleteWarningBanner') deleteWarningBanner?: ElementRef<HTMLElement>;
  @ViewChild('successBanner') successBanner?: ElementRef<HTMLElement>;

  authors: Author[] = [];
  viewAuthors: Author[] = [];
  deleteWarning: string | null = null;
  successMessage: string | null = null;
  searchTerm = '';
  cityFilter = '';
  stateFilter = '';
  contractFilter: ContractFilter = 'all';
  draftSearchTerm = '';
  draftCityFilter = '';
  draftStateFilter = '';
  draftContractFilter: ContractFilter = 'all';
  draftSortKey: SortKey = 'au_lname';
  draftSortDirection: SortDirection = 'asc';
  savedViews: SavedView[] = [];
  selectedSavedViewName = '';
  newSavedViewName = '';
  sortKey: SortKey = 'au_lname';
  sortDirection: SortDirection = 'asc';
  pageSize = 10;
  autoFitPageSize = 10;
  manualPageSize: number | null = null;
  readonly pageSizeOptions = [5, 10, 15, 20, 25, 50];
  currentPage = 1;

  constructor(
    private authorService: AuthorService,
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
    this.loadAuthors();
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

  loadAuthors() {
    this.authorService.getAuthors().subscribe({
      next: authors => {
        this.ngZone.run(() => {
          this.authors = authors;
          this.recomputeViewAuthors();
          this.ensureCurrentPageInBounds();
        });
      },
      error: err => console.error('Error loading authors', err)
    });
  }

  openAuthor(id: string) : void {
    window.open(`/authors/${id}`, '_blank');
  }

  deleteAuthor(id: string): void {
    const confirmed = confirm('Are you sure you want to delete this author?');
    if (confirmed) {
      this.deleteWarning = null;
      this.authorService.deleteAuthor(id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.deleteWarning = null;
            this.authors = this.authors.filter(author => author.au_id !== id);
            this.recomputeViewAuthors();
            this.ensureCurrentPageInBounds();
            this.setSuccessMessage('Author deleted successfully.');
          });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.deleteWarning = err.error?.error || 'This author cannot be deleted because they are linked to one or more books.';
            this.scrollToDeleteWarning();
            return;
          }

          this.deleteWarning = 'Unable to delete this author right now. Please try again.';
          this.scrollToDeleteWarning();
          console.error('Error deleting author', err);
        }
      });
    }
  }

  applySearch(): void {
    this.searchTerm = this.draftSearchTerm;
    this.cityFilter = this.draftCityFilter;
    this.stateFilter = this.draftStateFilter;
    this.contractFilter = this.draftContractFilter;
    this.sortKey = this.draftSortKey;
    this.sortDirection = this.draftSortDirection;
    this.recomputeViewAuthors();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  clearFilters(): void {
    this.draftSearchTerm = '';
    this.draftCityFilter = '';
    this.draftStateFilter = '';
    this.draftContractFilter = 'all';
    this.searchTerm = '';
    this.cityFilter = '';
    this.stateFilter = '';
    this.contractFilter = 'all';
    this.selectedSavedViewName = '';
    this.recomputeViewAuthors();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  exportToExcel(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.viewAuthors.length === 0) {
      this.setSuccessMessage('No authors to export for the current filters.');
      return;
    }

    const headers = ['Author ID', 'First Name', 'Last Name', 'Phone', 'Address', 'City', 'State', 'Zip', 'Contract'];
    const rows = this.viewAuthors.map((author) => [
      author.au_id,
      author.au_fname,
      author.au_lname,
      author.phone,
      author.address,
      author.city,
      author.state,
      author.zip,
      author.contract ? 'Yes' : 'No',
    ]);

    const csvLines = [headers, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.setAttribute('download', `authors-export-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.setSuccessMessage('Authors exported successfully (Excel-compatible CSV).');
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
      contract: this.contractFilter,
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
    this.contractFilter = selectedView.contract;
    this.sortKey = selectedView.sortKey;
    this.sortDirection = selectedView.sortDirection;
    this.draftSearchTerm = selectedView.searchTerm;
    this.draftCityFilter = selectedView.city;
    this.draftStateFilter = selectedView.state;
    this.draftContractFilter = selectedView.contract;
    this.draftSortKey = selectedView.sortKey;
    this.draftSortDirection = selectedView.sortDirection;
    this.recomputeViewAuthors();
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
    return this.getDistinctValues(this.authors.map(author => author.city));
  }

  get stateOptions(): string[] {
    return this.getDistinctValues(this.authors.map(author => author.state));
  }

  get listStats(): Stat[] {
    return [
      { label: 'Total authors', value: this.authors.length },
      { label: 'Showing', value: `${this.viewAuthors.length} / ${this.authors.length}` },
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

  sortByHeader(sortKey: SortKey): void {
    if (this.sortKey === sortKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = sortKey;
      this.sortDirection = 'asc';
    }

    this.draftSortKey = this.sortKey;
    this.draftSortDirection = this.sortDirection;
    this.recomputeViewAuthors();
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

  trackByAuthorId(_index: number, author: Author): string {
    return author.au_id;
  }

  get pagedAuthors(): Author[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.viewAuthors.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    if (this.viewAuthors.length === 0) {
      return 1;
    }

    return Math.ceil(this.viewAuthors.length / this.pageSize);
  }

  get pageStartItem(): number {
    if (this.viewAuthors.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEndItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.viewAuthors.length);
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

  private getComparableValue(author: Author, key: SortKey): string | number {
    if (key === 'contract') {
      return author.contract ? 1 : 0;
    }

    return (author[key] ?? '').toString().toLowerCase();
  }

  private recomputeViewAuthors(): void {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();
    const normalizedCity = this.cityFilter.trim().toLowerCase();
    const normalizedState = this.stateFilter.trim().toLowerCase();
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    const filtered = this.authors.filter(author => {
      const matchesTerm = !normalizedTerm || this.matchesSearch(author, normalizedTerm);
      const matchesCity = !normalizedCity || (author.city ?? '').toLowerCase() === normalizedCity;
      const matchesState = !normalizedState || (author.state ?? '').toLowerCase() === normalizedState;
      const matchesContract = this.contractFilter === 'all'
        || (this.contractFilter === 'yes' && author.contract)
        || (this.contractFilter === 'no' && !author.contract);

      return matchesTerm && matchesCity && matchesState && matchesContract;
    });

    this.viewAuthors = filtered.sort((a, b) => {
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

  private matchesSearch(author: Author, normalizedTerm: string): boolean {
    const valuesToSearch = [
      author.au_id,
      author.au_fname,
      author.au_lname,
      author.phone,
      author.address,
      author.city,
      author.state,
      author.zip,
      author.contract ? 'true yes 1' : 'false no 0'
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
      this.setSuccessMessage('Author created successfully.');
    }

    if (successAction === 'updated') {
      this.setSuccessMessage('Author updated successfully.');
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
