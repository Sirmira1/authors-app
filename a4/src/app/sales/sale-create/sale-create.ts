import { Component, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { SaleService, Sale } from '../sale';
import { SaleFormComponent } from '../sale-form/sale-form';

@Component({
  selector: 'app-sale-create',
  imports: [SaleFormComponent],
  templateUrl: './sale-create.html',
  styleUrl: './sale-create.scss',
})
export class SaleCreateComponent {
  isSubmitting = false;
  errorMessage = '';

  sale: Sale = {
    stor_id: '',
    ord_num: '',
    ord_date: new Date().toISOString().slice(0, 10),
    qty: 1,
    payterms: '',
    title_id: ''
  };

  constructor(
    private saleService: SaleService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  createSale(salePayload: Sale): void {
    this.errorMessage = '';
    this.isSubmitting = true;

    this.saleService.addSale(salePayload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.router.navigate(['/sales'], { queryParams: { success: 'created' } });
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          if (err?.error?.error) {
            this.errorMessage = `Could not create sale: ${err.error.error}.`;
          } else {
            this.errorMessage = 'Could not create sale. Check the field values and try again.';
          }
        });
        console.error('Error creating sale', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/sales']);
  }
}
