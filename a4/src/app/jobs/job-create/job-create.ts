import { Component, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { JobService, Job } from '../job';
import { JobFormComponent } from '../job-form/job-form';

@Component({
  selector: 'app-job-create',
  imports: [JobFormComponent],
  templateUrl: './job-create.html',
  styleUrl: './job-create.scss',
})
export class JobCreateComponent {
  isSubmitting = false;
  errorMessage = '';

  job: Job = {
    job_id: 0,
    job_desc: '',
    min_lvl: 10,
    max_lvl: 250
  };

  constructor(
    private jobService: JobService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  createJob(jobPayload: Job): void {
    this.errorMessage = '';
    this.isSubmitting = true;

    this.jobService.addJob(jobPayload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.router.navigate(['/jobs'], { queryParams: { success: 'created' } });
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          if (err?.error?.error) {
            this.errorMessage = `Could not create job: ${err.error.error}.`;
          } else {
            this.errorMessage = 'Could not create job. Check the field values and try again.';
          }
        });
        console.error('Error creating job', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/jobs']);
  }
}
