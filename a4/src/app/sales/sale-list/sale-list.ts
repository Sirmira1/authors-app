import { Component, ElementRef, HostListener, Inject, NgZone, PLATFORM_ID, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Sale, SaleService } from '../sale';

type SortKey = 'stor_name' | 'ord_num' | 'ord_date' | 'qty' | 'payterms' | 'title';
type SortDirection = 'asc' | 'desc';

interface SavedView {
  name: string;
  searchTerm: string;
  store: string;
  title: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

@Component({
  selector: 'app-sale-list',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './sale-list.html',
  styleUrl: './sale-list.scss'
})
export class SaleListComponent implements OnInit {
  private readonly savedViewsKey = 'sale-list-saved-views';
  private readonly manualPageSizeKey = 'sale-list-manual-page-size';
  private successMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('deleteWarningBanner') deleteWarningBanner?: ElementRef<HTMLElement>;
  @ViewChild('successBanner') successBanner?: ElementRef<HTMLElement>;

  sales: Sale[] = [];
  viewSales: Sale[] = [];
  deleteWarning: string | null = null;
  successMessage: string | null = null;
  searchTerm = '';
  storeFilter = '';
  titleFilter = '';
  draftSearchTerm = '';
  draftStoreFilter = '';
  draftTitleFilter = '';
  draftSortKey: SortKey = 'ord_date';
  draftSortDirection: SortDirection = 'desc';
  savedViews: SavedView[] = [];
  selectedSavedViewName = '';
  newSavedViewName = '';
  sortKey: SortKey = 'ord_date';
  sortDirection: SortDirection = 'desc';
  pageSize = 10;
  autoFitPageSize = 10;
  manualPageSize: number | null = null;
  readonly pageSizeOptions = [5, 10, 15, 20, 25, 50];
  currentPage = 1;

  constructor(
    private saleService: SaleService,
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
    this.loadSales();
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

  loadSales() {
    this.saleService.getSales().subscribe({
      next: sales => {
        this.ngZone.run(() => {
          this.sales = sales;
          this.recomputeViewSales();
          this.ensureCurrentPageInBounds();
        });
      },
      error: err => console.error('Error loading sales', err)
    });
  }

  deleteSale(sale: Sale): void {
    const confirmed = confirm('Are you sure you want to delete this sale?');
    if (confirmed) {
      this.deleteWarning = null;
      this.saleService.deleteSale(sale.stor_id, sale.ord_num).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.deleteWarning = null;
            this.sales = this.sales.filter(item => !(item.stor_id === sale.stor_id && item.ord_num === sale.ord_num));
            this.recomputeViewSales();
            this.ensureCurrentPageInBounds();
            this.setSuccessMessage('Sale deleted successfully.');
          });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.deleteWarning = err.error?.error || 'This sale cannot be deleted because it is linked to other records.';
            this.scrollToDeleteWarning();
            return;
          }

          this.deleteWarning = 'Unable to delete this sale right now. Please try again.';
          this.scrollToDeleteWarning();
          console.error('Error deleting sale', err);
        }
      });
    }
  }

  applySearch(): void {
    this.searchTerm = this.draftSearchTerm;
    this.storeFilter = this.draftStoreFilter;
    this.titleFilter = this.draftTitleFilter;
    this.sortKey = this.draftSortKey;
    this.sortDirection = this.draftSortDirection;
    this.recomputeViewSales();
    this.currentPage = 1;
    this.ensureCurrentPageInBounds();
  }

  clearFilters(): void {
    this.draftSearchTerm = '';
    this.draftStoreFilter = '';
    this.draftTitleFilter = '';
    this.searchTerm = '';
    this.storeFilter = '';
    this.titleFilter = '';
    this.selectedSavedViewName = '';
    this.recomputeViewSales();
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
      store: this.storeFilter,
      title: this.titleFilter,
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
    this.storeFilter = selectedView.store;
    this.titleFilter = selectedView.title;
    this.sortKey = selectedView.sortKey;
    this.sortDirection = selectedView.sortDirection;
    this.draftSearchTerm = selectedView.searchTerm;
    this.draftStoreFilter = selectedView.store;
    this.draftTitleFilter = selectedView.title;
    this.draftSortKey = selectedView.sortKey;
    this.draftSortDirection = selectedView.sortDirection;
    this.recomputeViewSales();
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

  get storeOptions(): string[] {
    return this.getDistinctValues(this.sales.map(sale => sale.stor_name ?? ''));
  }

  get titleOptions(): string[] {
    return this.getDistinctValues(this.sales.map(sale => sale.title ?? ''));
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
    this.recomputeViewSales();
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

  trackBySaleKey(_index: number, sale: Sale): string {
    return `${sale.stor_id}-${sale.ord_num}`;
  }

  get pagedSales(): Sale[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.viewSales.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    if (this.viewSales.length === 0) {
      return 1;
    }

    return Math.ceil(this.viewSales.length / this.pageSize);
  }

  get pageStartItem(): number {
    if (this.viewSales.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEndItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.viewSales.length);
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

  private getComparableValue(sale: Sale, key: SortKey): string | number {
    if (key === 'qty') {
      return sale.qty ?? -1;
    }

    if (key === 'ord_date') {
      const time = new Date(sale.ord_date).getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    return (sale[key] ?? '').toString().toLowerCase();
  }

  private recomputeViewSales(): void {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();
    const normalizedStore = this.storeFilter.trim().toLowerCase();
    const normalizedTitle = this.titleFilter.trim().toLowerCase();
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    const filtered = this.sales.filter(sale => {
      const matchesTerm = !normalizedTerm || this.matchesSearch(sale, normalizedTerm);
      const matchesStore = !normalizedStore || (sale.stor_name ?? '').toLowerCase() === normalizedStore;
      const matchesTitle = !normalizedTitle || (sale.title ?? '').toLowerCase() === normalizedTitle;

      return matchesTerm && matchesStore && matchesTitle;
    });

    this.viewSales = filtered.sort((a, b) => {
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

  private matchesSearch(sale: Sale, normalizedTerm: string): boolean {
    const valuesToSearch = [
      sale.stor_id,
      sale.stor_name,
      sale.ord_num,
      sale.qty,
      sale.payterms,
      sale.title_id,
      sale.title
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
      this.setSuccessMessage('Sale created successfully.');
    }

    if (successAction === 'updated') {
      this.setSuccessMessage('Sale updated successfully.');
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
