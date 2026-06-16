import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SaleService, Sale } from '../sale';

@Component({
  selector: 'app-sale-detail',
  imports: [RouterLink, CommonModule],
  templateUrl: './sale-detail.html',
  styleUrl: './sale-detail.scss',
})
export class SaleDetailComponent {
  sale: Sale | undefined;

  constructor(private route: ActivatedRoute, private saleService: SaleService) {
    const storId = this.route.snapshot.paramMap.get('storId');
    const ordNum = this.route.snapshot.paramMap.get('ordNum');
    if (storId && ordNum) {
      this.saleService.getSaleByKey(storId, ordNum).subscribe({
        next: sale => {
          this.sale = sale;
        },
        error: err => console.error('Error loading sale', err)
      });
    }
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  }
}
