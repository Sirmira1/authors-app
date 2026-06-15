import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthorService, Author } from '../author';
import { AuthorFormComponent } from '../author-form/author-form';

@Component({
  selector: 'app-author-create',
  imports: [AuthorFormComponent],
  templateUrl: './author-create.html',
  styleUrl: './author-create.scss',
})
export class AuthorCreateComponent implements OnInit {
  private readonly maxIdGenerationRetries = 3;

  isSubmitting = false;
  errorMessage = '';

  author: Author = {
    au_id: '',
    au_fname: '',
    au_lname: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    contract: false
  };

  constructor(
    private authorService: AuthorService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.generateAuthorId();
  }

  generateAuthorId(attempt = 1): void {
    this.authorService.generateAuthorId().subscribe({
      next: (response) => {
        this.author = {
          ...this.author,
          au_id: response.au_id,
        };
        this.errorMessage = '';
      },
      error: err => {
        if (attempt < this.maxIdGenerationRetries) {
          setTimeout(() => this.generateAuthorId(attempt + 1), 300);
          return;
        }

        this.errorMessage = 'Could not generate author ID. Please refresh and try again.';
        console.error('Error generating author id:', err);
      }
    });
  }

  createAuthor(authorPayload: Author): void {
    if (!authorPayload.au_id?.trim()) {
      this.errorMessage = 'Author ID is still being generated. Please wait a moment and try again.';
      this.generateAuthorId();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authorService.addAuthor(authorPayload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.router.navigate(['/authors'], { queryParams: { success: 'created' } });
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          if (err?.status === 409 && err?.error?.error) {
            this.errorMessage = err.error.error;
          } else if (err?.error?.error) {
            this.errorMessage = `Could not create author: ${err.error.error}.`;
          } else {
            this.errorMessage = 'Could not create author. Check ID, State, and Zip formats and try again.';
          }
        });
        console.error('Error creating author', err);
      }
    });
  }
}
