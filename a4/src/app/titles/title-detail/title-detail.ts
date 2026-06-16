import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TitleService, Title } from '../title';

@Component({
  selector: 'app-title-detail',
  imports: [RouterLink, CommonModule],
  templateUrl: './title-detail.html',
  styleUrl: './title-detail.scss',
})
export class TitleDetailComponent {
  title: Title | undefined;

  constructor(private route: ActivatedRoute, private titleService: TitleService) {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.titleService.getTitleById(id).subscribe({
        next: title => {
          this.title = title;
        },
        error: err => console.error('Error loading title', err)
      });
    }
  }

  formatMoney(value: number | null | undefined): string {
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

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  }
}
