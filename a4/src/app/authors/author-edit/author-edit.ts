import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { AuthorService, Author } from '../author';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-author-edit',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './author-edit.html',
  styleUrl: './author-edit.scss',
})
export class AuthorEditComponent {
  author: Author | undefined;
  authorId: string | null = null;
  errorMessage = '';
  readonly idPattern = /^\d{3}-\d{2}-\d{4}$/;
  readonly statePattern = /^[A-Za-z]{2}$/;
  readonly zipPattern = /^\d{5}$/;

  constructor(
    private authorService: AuthorService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.authorId = this.route.snapshot.paramMap.get('id');
    if (this.authorId) {
      this.authorService.getAuthorById(this.authorId).subscribe({
        next: author => {
          this.author = author;
        },
        error: err => console.error('Error loading author', err)
      });
    } 
  }
  saveAuthor(form: NgForm) : void {
    if (!this.author || form.invalid || !this.hasValidAuthorFormat()) {
      this.errorMessage = 'Please fix invalid fields. Format: ID 123-45-6789, State 2 letters, Zip 5 digits.';
      return;
    }

    this.errorMessage = '';

    if (this.authorId && this.author) {
      this.authorService.updateAuthor(this.author).subscribe({
        next: () => {
          this.router.navigate(['/authors']);
        },
        error: err => {
          this.errorMessage = 'Could not update author. Check field formats and try again.';
          console.error('Error updating author', err);
        }
      });
    }
  }

  showFieldError(control: NgModel): boolean {
    return !!(control.invalid && (control.dirty || control.touched));
  }

  private hasValidAuthorFormat(): boolean {
    if (!this.author) {
      return false;
    }

    return (
      this.idPattern.test((this.author.au_id ?? '').trim()) &&
      this.statePattern.test((this.author.state ?? '').trim()) &&
      this.zipPattern.test((this.author.zip ?? '').trim())
    );
  }
}
