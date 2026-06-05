import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthorService, Author } from '../author';

@Component({
  selector: 'app-author-detail',
  imports: [RouterLink, CommonModule],
  templateUrl: './author-detail.html',
  styleUrl: './author-detail.scss',
})
export class AuthorDetailComponent {
  author: Author | undefined;

  constructor(private route: ActivatedRoute, private authorService: AuthorService) {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.authorService.getAuthorById(id).subscribe({
        next: author => {
          this.author = author;
        },
        error: err => console.error('Error loading author', err)
      });
    }
  }

}
