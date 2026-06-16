import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PublisherService, Publisher } from '../publisher';

@Component({
  selector: 'app-publisher-detail',
  imports: [RouterLink, CommonModule],
  templateUrl: './publisher-detail.html',
  styleUrl: './publisher-detail.scss',
})
export class PublisherDetailComponent {
  publisher: Publisher | undefined;

  constructor(private route: ActivatedRoute, private publisherService: PublisherService) {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.publisherService.getPublisherById(id).subscribe({
        next: publisher => {
          this.publisher = publisher;
        },
        error: err => console.error('Error loading publisher', err)
      });
    }
  }

}
