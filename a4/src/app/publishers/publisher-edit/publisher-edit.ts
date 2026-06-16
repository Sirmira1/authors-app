import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublisherService, Publisher } from '../publisher';
import { ActivatedRoute, Router } from '@angular/router';
import { PublisherFormComponent } from '../publisher-form/publisher-form';

@Component({
  selector: 'app-publisher-edit',
  imports: [CommonModule, PublisherFormComponent],
  templateUrl: './publisher-edit.html',
  styleUrl: './publisher-edit.scss',
})
export class PublisherEditComponent {
  publisher: Publisher | undefined;
  publisherId: string | null = null;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private publisherService: PublisherService,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.publisherId = this.route.snapshot.paramMap.get('id');
    if (this.publisherId) {
      this.publisherService.getPublisherById(this.publisherId).subscribe({
        next: publisher => {
          this.errorMessage = '';
          this.publisher = publisher;
        },
        error: err => {
          this.errorMessage = 'Could not load publisher details.';
          console.error('Error loading publisher', err);
        }
      });
    }
  }

  savePublisher(publisherPayload: Publisher): void {
    if (!this.publisherId) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.publisherService.updatePublisher(publisherPayload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.router.navigate(['/publishers'], { queryParams: { success: 'updated' } });
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          if (err?.status === 409 && err?.error?.error) {
            this.errorMessage = err.error.error;
          } else if (err?.error?.error) {
            this.errorMessage = `Could not update publisher: ${err.error.error}.`;
          } else {
            this.errorMessage = 'Could not update publisher. Check field formats and try again.';
          }
        });
        console.error('Error updating publisher', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/publishers']);
  }
}
