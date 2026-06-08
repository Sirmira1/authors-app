import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthorService, Author } from '../author';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthorFormComponent } from '../author-form/author-form';

@Component({
  selector: 'app-author-edit',
  imports: [CommonModule, AuthorFormComponent],
  templateUrl: './author-edit.html',
  styleUrl: './author-edit.scss',
})
export class AuthorEditComponent {
  author: Author | undefined;
  authorId: string | null = null;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private authorService: AuthorService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.authorId = this.route.snapshot.paramMap.get('id');
    if (this.authorId) {
      this.authorService.getAuthorById(this.authorId).subscribe({
        next: author => {
          this.errorMessage = '';
          this.author = author;
        },
        error: err => {
          this.errorMessage = 'Could not load author details.';
          console.error('Error loading author', err);
        }
      });
    }
  }

  saveAuthor(authorPayload: Author): void {
    if (!this.authorId) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authorService.updateAuthor(authorPayload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/authors']);
      },
      error: err => {
        this.isSubmitting = false;
        this.errorMessage = 'Could not update author. Check field formats and try again.';
        console.error('Error updating author', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/authors']);
  }
}
