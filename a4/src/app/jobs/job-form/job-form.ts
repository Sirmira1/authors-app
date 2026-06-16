import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Job } from '../job';

@Component({
  selector: 'app-job-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './job-form.html',
  styleUrl: './job-form.scss',
})
export class JobFormComponent implements OnChanges {
  @Input() job: Job | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() isSubmitting = false;
  @Input() errorMessage = '';

  @Output() save = new EventEmitter<Job>();
  @Output() cancel = new EventEmitter<void>();

  localValidationMessage = '';

  formJob: Job = this.createEmptyJob();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['job']) {
      this.formJob = this.cloneJob(this.job);
    }
  }

  handleSubmit(form: NgForm): void {
    if (form.invalid || !this.hasValidJobFormat()) {
      this.localValidationMessage = this.getDetailedValidationErrors();
      return;
    }

    this.localValidationMessage = '';
    this.save.emit(this.buildJobPayload());
  }

  showFieldError(control: NgModel): boolean {
    return !!(control.invalid && (control.dirty || control.touched));
  }

  private getDetailedValidationErrors(): string {
    const errors: string[] = [];

    if (!this.formJob.job_desc.trim()) {
      errors.push('Description: required');
    }
    if (!this.isLevel(this.formJob.min_lvl)) {
      errors.push('Min level: 10-250');
    }
    if (!this.isLevel(this.formJob.max_lvl)) {
      errors.push('Max level: 10-250');
    }
    if (this.isLevel(this.formJob.min_lvl) && this.isLevel(this.formJob.max_lvl) && Number(this.formJob.min_lvl) > Number(this.formJob.max_lvl)) {
      errors.push('Min level cannot exceed max level');
    }

    return errors.length > 0 ? 'Fix these errors: ' + errors.join(', ') + '.' : 'Please fix all required fields.';
  }

  private isLevel(value: number): boolean {
    return Number.isInteger(Number(value)) && Number(value) >= 10 && Number(value) <= 250;
  }

  private hasValidJobFormat(): boolean {
    return (
      this.formJob.job_desc.trim().length > 0 &&
      this.isLevel(this.formJob.min_lvl) &&
      this.isLevel(this.formJob.max_lvl) &&
      Number(this.formJob.min_lvl) <= Number(this.formJob.max_lvl)
    );
  }

  private buildJobPayload(): Job {
    return {
      ...this.formJob,
      job_desc: this.formJob.job_desc.trim(),
      min_lvl: Number(this.formJob.min_lvl),
      max_lvl: Number(this.formJob.max_lvl),
    };
  }

  private cloneJob(job: Job | null): Job {
    if (!job) {
      return this.createEmptyJob();
    }

    return {
      ...job,
    };
  }

  private createEmptyJob(): Job {
    return {
      job_id: 0,
      job_desc: '',
      min_lvl: 10,
      max_lvl: 250,
    };
  }
}
