import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { JobService, Job } from '../job';

@Component({
  selector: 'app-job-detail',
  imports: [RouterLink, CommonModule],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.scss',
})
export class JobDetailComponent {
  job: Job | undefined;

  constructor(private route: ActivatedRoute, private jobService: JobService) {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.jobService.getJobById(Number(idParam)).subscribe({
        next: job => {
          this.job = job;
        },
        error: err => console.error('Error loading job', err)
      });
    }
  }

}
