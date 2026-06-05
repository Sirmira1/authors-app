import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthorService, Author } from '../author';

@Component({
  selector: 'app-author-create',
  imports: [FormsModule],
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

  createAuthor(form: NgForm) : void {
    if (form.invalid || !this.hasValidAuthorFormat()) {
      this.errorMessage = 'Please use format: ID 123-45-6789, State 2 letters, Zip 5 digits.';
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authorService.addAuthor(this.buildAuthorPayload()).subscribe({
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

  private buildAuthorPayload(): Author {
    return {
      ...this.author,
      au_id: this.author.au_id.trim(),
      au_fname: this.author.au_fname.trim(),
      au_lname: this.author.au_lname.trim(),
      phone: this.author.phone.trim(),
      address: this.author.address.trim(),
      city: this.author.city.trim(),
      state: this.author.state.trim().toUpperCase(),
      zip: this.author.zip.trim(),
    };
  }

  private hasValidAuthorFormat(): boolean {
    const idPattern = /^\d{3}-\d{2}-\d{4}$/;
    const statePattern = /^[A-Za-z]{2}$/;
    const zipPattern = /^\d{5}$/;

    return (
      idPattern.test(this.author.au_id.trim()) &&
      statePattern.test(this.author.state.trim()) &&
      zipPattern.test(this.author.zip.trim())
    );
  }
}
