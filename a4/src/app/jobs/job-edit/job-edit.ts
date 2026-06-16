import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobService, Job } from '../job';
import { ActivatedRoute, Router } from '@angular/router';
import { JobFormComponent } from '../job-form/job-form';

@Component({
  selector: 'app-job-edit',
  imports: [CommonModule, JobFormComponent],
  templateUrl: './job-edit.html',
  styleUrl: './job-edit.scss',
})
export class JobEditComponent {
  job: Job | undefined;
  jobId: number | null = null;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone
  ) {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.jobId = idParam !== null ? Number(idParam) : null;
    if (this.jobId !== null) {
      this.jobService.getJobById(this.jobId).subscribe({
        next: job => {
          this.errorMessage = '';
          this.job = job;
        },
        error: err => {
          this.errorMessage = 'Could not load job details.';
          console.error('Error loading job', err);
        }
      });
    }
  }

  saveJob(jobPayload: Job): void {
    if (this.jobId === null) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.jobService.updateJob({ ...jobPayload, job_id: this.jobId }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.router.navigate(['/jobs'], { queryParams: { success: 'updated' } });
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          if (err?.error?.error) {
            this.errorMessage = `Could not update job: ${err.error.error}.`;
          } else {
            this.errorMessage = 'Could not update job. Check the field values and try again.';
          }
        });
        console.error('Error updating job', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/jobs']);
  }
}
