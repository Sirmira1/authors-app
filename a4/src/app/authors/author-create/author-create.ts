import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthorService, Author } from '../author';
import { AuthorFormComponent } from '../author-form/author-form';

@Component({
  selector: 'app-author-create',
  imports: [AuthorFormComponent],
  templateUrl: './author-create.html',
  styleUrl: './author-create.scss',
})
export class AuthorCreateComponent {
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

  constructor(private authorService: AuthorService, private router: Router) {}

  createAuthor(authorPayload: Author): void {
    this.errorMessage = '';
    this.isSubmitting = true;

    this.authorService.addAuthor(authorPayload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/authors']);
      },
      error: err => {
        this.isSubmitting = false;
        this.errorMessage = 'Could not create author. Check ID, State, and Zip formats and try again.';
        console.error('Error creating author', err);
      }
    });
  }
}
