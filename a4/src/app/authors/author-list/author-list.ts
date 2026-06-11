import { Component, ElementRef, HostListener, Inject, PLATFORM_ID, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Author, AuthorService } from '../author';

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
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './author-list.html',
  styleUrl: './author-list.scss'
})
export class AuthorListComponent implements OnInit {
  private readonly savedViewsKey = 'author-list-saved-views';
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
  savedViews: SavedView[] = [];
  selectedSavedViewName = '';
  newSavedViewName = '';
  sortKey: SortKey = 'au_lname';
  sortDirection: SortDirection = 'asc';
  pageSize = 10;
  currentPage = 1;

  constructor(
    private authorService: AuthorService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.updatePageSizeForViewport();
  }

  ngOnInit(): void {
    this.consumeSuccessQueryParam();
    this.loadSavedViews();
    this.loadAuthors();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updatePageSizeForViewport();
  }

  loadAuthors() {
    this.authorService.getAuthors().subscribe({
      next: authors => {
        this.authors = authors;
        this.recomputeViewAuthors();
        this.ensureCurrentPageInBounds();
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
          this.deleteWarning = null;
          this.authors = this.authors.filter(author => author.au_id !== id);
          this.recomputeViewAuthors();
          this.ensureCurrentPageInBounds();
          this.setSuccessMessage('Author deleted successfully.');
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

  onSortSelectionChange(sortKey: SortKey): void {
    this.sortKey = sortKey;
    this.recomputeViewAuthors();
    this.currentPage = 1;
  }

  onSortDirectionChange(direction: SortDirection): void {
    this.sortDirection = direction;
    this.recomputeViewAuthors();
    this.currentPage = 1;
  }

  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.recomputeViewAuthors();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  onCityFilterChange(city: string): void {
    this.cityFilter = city;
    this.recomputeViewAuthors();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  onStateFilterChange(state: string): void {
    this.stateFilter = state;
    this.recomputeViewAuthors();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  onContractFilterChange(filter: ContractFilter): void {
    this.contractFilter = filter;
    this.recomputeViewAuthors();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.cityFilter = '';
    this.stateFilter = '';
    this.contractFilter = 'all';
    this.selectedSavedViewName = '';
    this.recomputeViewAuthors();
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
      this.recomputeViewAuthors();
      this.currentPage = 1;
      return;
    }

    this.sortKey = sortKey;
    this.sortDirection = 'asc';
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
      this.pageSize = 10;
      this.ensureCurrentPageInBounds();
      return;
    }

    const viewportHeight = window.innerHeight;
    const reservedHeight = 420;
    const estimatedRowHeight = 35;
    const availableForRows = Math.max(viewportHeight - reservedHeight, estimatedRowHeight * 5);
    const computed = Math.floor(availableForRows / estimatedRowHeight);

    this.pageSize = Math.max(5, Math.min(12, computed));
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
