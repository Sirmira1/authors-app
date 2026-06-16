import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaleService, Sale } from '../sale';
import { ActivatedRoute, Router } from '@angular/router';
import { SaleFormComponent } from '../sale-form/sale-form';

@Component({
  selector: 'app-sale-edit',
  imports: [CommonModule, SaleFormComponent],
  templateUrl: './sale-edit.html',
  styleUrl: './sale-edit.scss',
})
export class SaleEditComponent {
  sale: Sale | undefined;
  storId: string | null = null;
  ordNum: string | null = null;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private saleService: SaleService,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.storId = this.route.snapshot.paramMap.get('storId');
    this.ordNum = this.route.snapshot.paramMap.get('ordNum');
    if (this.storId && this.ordNum) {
      this.saleService.getSaleByKey(this.storId, this.ordNum).subscribe({
        next: sale => {
          this.errorMessage = '';
          this.sale = sale;
        },
        error: err => {
          this.errorMessage = 'Could not load sale details.';
          console.error('Error loading sale', err);
        }
      });
    }
  }

  saveSale(salePayload: Sale): void {
    if (!this.storId || !this.ordNum) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.saleService.updateSale({ ...salePayload, stor_id: this.storId, ord_num: this.ordNum }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.router.navigate(['/sales'], { queryParams: { success: 'updated' } });
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          if (err?.error?.error) {
            this.errorMessage = `Could not update sale: ${err.error.error}.`;
          } else {
            this.errorMessage = 'Could not update sale. Check the field values and try again.';
          }
        });
        console.error('Error updating sale', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/sales']);
  }
}
