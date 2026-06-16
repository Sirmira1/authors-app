import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Sale, Store, SaleService } from '../sale';
import { Title, TitleService } from '../../titles/title';

@Component({
  selector: 'app-sale-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './sale-form.html',
  styleUrl: './sale-form.scss',
})
export class SaleFormComponent implements OnChanges, OnInit {
  @Input() sale: Sale | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() isSubmitting = false;
  @Input() errorMessage = '';

  @Output() save = new EventEmitter<Sale>();
  @Output() cancel = new EventEmitter<void>();

  localValidationMessage = '';
  stores: Store[] = [];
  titles: Title[] = [];

  formSale: Sale = this.createEmptySale();

  constructor(
    private saleService: SaleService,
    private titleService: TitleService
  ) {}

  ngOnInit(): void {
    this.saleService.getStores().subscribe({
      next: stores => (this.stores = stores),
      error: err => console.error('Error loading stores for sale form', err)
    });
    this.titleService.getTitles().subscribe({
      next: titles => (this.titles = titles),
      error: err => console.error('Error loading titles for sale form', err)
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sale']) {
      this.formSale = this.cloneSale(this.sale);
    }
  }

  handleSubmit(form: NgForm): void {
    if (form.invalid) {
      this.localValidationMessage = this.getDetailedValidationErrors();
      return;
    }

    this.localValidationMessage = '';
    this.save.emit(this.buildSalePayload());
  }

  showFieldError(control: NgModel): boolean {
    return !!(control.invalid && (control.dirty || control.touched));
  }

  private getDetailedValidationErrors(): string {
    const errors: string[] = [];

    if (!this.formSale.stor_id) {
      errors.push('Store: required');
    }
    if (!this.formSale.ord_num.trim()) {
      errors.push('Order number: required');
    }
    if (!this.formSale.qty || Number(this.formSale.qty) <= 0) {
      errors.push('Quantity: must be greater than zero');
    }
    if (!this.formSale.payterms.trim()) {
      errors.push('Pay terms: required');
    }
    if (!this.formSale.title_id) {
      errors.push('Title: required');
    }

    return errors.length > 0 ? 'Fix these errors: ' + errors.join(', ') + '.' : 'Please fix all required fields.';
  }

  private buildSalePayload(): Sale {
    return {
      ...this.formSale,
      stor_id: this.formSale.stor_id,
      ord_num: this.formSale.ord_num.trim(),
      qty: Number(this.formSale.qty),
      payterms: this.formSale.payterms.trim(),
      title_id: this.formSale.title_id,
    };
  }

  private cloneSale(sale: Sale | null): Sale {
    if (!sale) {
      return this.createEmptySale();
    }

    return {
      ...sale,
      ord_date: this.toDateInputValue(sale.ord_date),
    };
  }

  private toDateInputValue(value: string | null): string {
    if (!value) {
      return new Date().toISOString().slice(0, 10);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
  }

  private createEmptySale(): Sale {
    return {
      stor_id: '',
      ord_num: '',
      ord_date: new Date().toISOString().slice(0, 10),
      qty: 1,
      payterms: '',
      title_id: '',
    };
  }
}
