import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Author, AuthorService } from '../author';

@Component({
  selector: 'app-author-list',
  imports: [RouterLink, CommonModule],
  templateUrl: './author-list.html',
  styleUrl: './author-list.scss'
})
export class AuthorListComponent {
  authors: Author[] = [];

  constructor(private authorService: AuthorService) {
    this.loadAuthors();
  }

  loadAuthors() {
    this.authorService.getAuthors().subscribe({
      next: authors => {
        this.authors = authors;
      },
      error: err => console.error('Error loading authors', err)
    });
  }

  openAuthor(id: string) : void {
    window.open(`/authors/${id}`, '_blank');
  }

  deleteAuthor(id: string): void {
    const confirmed = confirm('Are you sure you want to delete this author?');
    if (confirmed) {
      this.authorService.deleteAuthor(id).subscribe({
        next: () => {
          this.loadAuthors();
        },
        error: err => console.error('Error deleting author', err)
      });
    }
  }
}
