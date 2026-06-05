import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  saveAuthor () : void {
    if (this.authorId && this.author) {
      this.authorService.updateAuthor(this.author).subscribe({
        next: () => {
          this.router.navigate(['/authors']);
        },
        error: err => console.error('Error updating author', err)
      });
    }
  }
}
