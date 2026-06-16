import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleService, Title } from '../title';
import { ActivatedRoute, Router } from '@angular/router';
import { TitleFormComponent } from '../title-form/title-form';

@Component({
  selector: 'app-title-edit',
  imports: [CommonModule, TitleFormComponent],
  templateUrl: './title-edit.html',
  styleUrl: './title-edit.scss',
})
export class TitleEditComponent {
  title: Title | undefined;
  titleId: string | null = null;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private titleService: TitleService,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.titleId = this.route.snapshot.paramMap.get('id');
    if (this.titleId) {
      this.titleService.getTitleById(this.titleId).subscribe({
        next: title => {
          this.errorMessage = '';
          this.title = title;
        },
        error: err => {
          this.errorMessage = 'Could not load title details.';
          console.error('Error loading title', err);
        }
      });
    }
  }

  saveTitle(titlePayload: Title): void {
    if (!this.titleId) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.titleService.updateTitle({ ...titlePayload, title_id: this.titleId }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.router.navigate(['/titles'], { queryParams: { success: 'updated' } });
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          if (err?.error?.error) {
            this.errorMessage = `Could not update title: ${err.error.error}.`;
          } else {
            this.errorMessage = 'Could not update title. Check the field values and try again.';
          }
        });
        console.error('Error updating title', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/titles']);
  }
}
