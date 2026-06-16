import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TitleService, Title } from '../title';
import { TitleFormComponent } from '../title-form/title-form';

@Component({
  selector: 'app-title-create',
  imports: [TitleFormComponent],
  templateUrl: './title-create.html',
  styleUrl: './title-create.scss',
})
export class TitleCreateComponent implements OnInit {
  private readonly maxIdGenerationRetries = 3;

  isSubmitting = false;
  errorMessage = '';

  title: Title = {
    title_id: '',
    title: '',
    type: '',
    pub_id: null,
    price: null,
    advance: null,
    royalty: null,
    ytd_sales: null,
    notes: '',
    pubdate: new Date().toISOString().slice(0, 10)
  };

  constructor(
    private titleService: TitleService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.generateTitleId();
  }

  generateTitleId(attempt = 1): void {
    this.titleService.generateTitleId().subscribe({
      next: (response) => {
        this.title = {
          ...this.title,
          title_id: response.title_id,
        };
        this.errorMessage = '';
      },
      error: err => {
        if (attempt < this.maxIdGenerationRetries) {
          setTimeout(() => this.generateTitleId(attempt + 1), 300);
          return;
        }

        this.errorMessage = 'Could not generate title ID. Please refresh and try again.';
        console.error('Error generating title id:', err);
      }
    });
  }

  createTitle(titlePayload: Title): void {
    if (!titlePayload.title_id?.trim()) {
      this.errorMessage = 'Title ID is still being generated. Please wait a moment and try again.';
      this.generateTitleId();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.titleService.addTitle(titlePayload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.router.navigate(['/titles'], { queryParams: { success: 'created' } });
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          if (err?.error?.error) {
            this.errorMessage = `Could not create title: ${err.error.error}.`;
          } else {
            this.errorMessage = 'Could not create title. Check the field values and try again.';
          }
        });
        console.error('Error creating title', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/titles']);
  }
}
