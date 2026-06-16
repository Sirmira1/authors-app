import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PublisherService, Publisher } from '../publisher';
import { PublisherFormComponent } from '../publisher-form/publisher-form';

@Component({
  selector: 'app-publisher-create',
  imports: [PublisherFormComponent],
  templateUrl: './publisher-create.html',
  styleUrl: './publisher-create.scss',
})
export class PublisherCreateComponent implements OnInit {
  private readonly maxIdGenerationRetries = 3;

  isSubmitting = false;
  errorMessage = '';

  publisher: Publisher = {
    pub_id: '',
    pub_name: '',
    city: '',
    state: '',
    country: ''
  };

  constructor(
    private publisherService: PublisherService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.generatePublisherId();
  }

  generatePublisherId(attempt = 1): void {
    this.publisherService.generatePublisherId().subscribe({
      next: (response) => {
        this.publisher = {
          ...this.publisher,
          pub_id: response.pub_id,
        };
        this.errorMessage = '';
      },
      error: err => {
        if (attempt < this.maxIdGenerationRetries) {
          setTimeout(() => this.generatePublisherId(attempt + 1), 300);
          return;
        }

        this.errorMessage = 'Could not generate publisher ID. Please refresh and try again.';
        console.error('Error generating publisher id:', err);
      }
    });
  }

  createPublisher(publisherPayload: Publisher): void {
    if (!publisherPayload.pub_id?.trim()) {
      this.errorMessage = 'Publisher ID is still being generated. Please wait a moment and try again.';
      this.generatePublisherId();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.publisherService.addPublisher(publisherPayload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.router.navigate(['/publishers'], { queryParams: { success: 'created' } });
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          if (err?.status === 409 && err?.error?.error) {
            this.errorMessage = err.error.error;
          } else if (err?.error?.error) {
            this.errorMessage = `Could not create publisher: ${err.error.error}.`;
          } else {
            this.errorMessage = 'Could not create publisher. Check the field formats and try again.';
          }
        });
        console.error('Error creating publisher', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/publishers']);
  }
}
