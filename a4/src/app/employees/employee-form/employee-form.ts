import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Employee } from '../employee';
import { Job, JobService } from '../../jobs/job';
import { Publisher, PublisherService } from '../../publishers/publisher';

@Component({
  selector: 'app-employee-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss',
})
export class EmployeeFormComponent implements OnChanges, OnInit {
  @Input() employee: Employee | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() isSubmitting = false;
  @Input() errorMessage = '';

  @Output() save = new EventEmitter<Employee>();
  @Output() cancel = new EventEmitter<void>();

  readonly idPattern = /^([A-Za-z]{3}[1-9]\d{4}[FMfm]|[A-Za-z]-[A-Za-z][1-9]\d{4}[FMfm])$/;

  localValidationMessage = '';
  jobs: Job[] = [];
  publishers: Publisher[] = [];

  formEmployee: Employee = this.createEmptyEmployee();

  constructor(
    private jobService: JobService,
    private publisherService: PublisherService
  ) {}

  ngOnInit(): void {
    this.jobService.getJobs().subscribe({
      next: jobs => (this.jobs = jobs),
      error: err => console.error('Error loading jobs for employee form', err)
    });
    this.publisherService.getPublishers().subscribe({
      next: publishers => (this.publishers = publishers),
      error: err => console.error('Error loading publishers for employee form', err)
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee']) {
      this.formEmployee = this.cloneEmployee(this.employee);
    }
  }

  handleSubmit(form: NgForm): void {
    if (form.invalid) {
      this.localValidationMessage = this.getDetailedValidationErrors();
      return;
    }

    this.localValidationMessage = '';
    this.save.emit(this.buildEmployeePayload());
  }

  showFieldError(control: NgModel): boolean {
    return !!(control.invalid && (control.dirty || control.touched));
  }

  private getDetailedValidationErrors(): string {
    const errors: string[] = [];

    if (!this.formEmployee.fname.trim()) {
      errors.push('First name: required');
    }
    if (!this.formEmployee.lname.trim()) {
      errors.push('Last name: required');
    }
    if (!this.formEmployee.job_id) {
      errors.push('Job: required');
    }

    return errors.length > 0 ? 'Fix these errors: ' + errors.join(', ') + '.' : 'Please fix all required fields.';
  }

  private buildEmployeePayload(): Employee {
    return {
      ...this.formEmployee,
      emp_id: this.formEmployee.emp_id.trim().toUpperCase(),
      fname: this.formEmployee.fname.trim(),
      minit: (this.formEmployee.minit || '').trim() || null,
      lname: this.formEmployee.lname.trim(),
      job_id: Number(this.formEmployee.job_id),
      job_lvl: this.formEmployee.job_lvl === null || this.formEmployee.job_lvl === undefined
        ? null
        : Number(this.formEmployee.job_lvl),
      pub_id: this.formEmployee.pub_id ? this.formEmployee.pub_id : null,
    };
  }

  private cloneEmployee(employee: Employee | null): Employee {
    if (!employee) {
      return this.createEmptyEmployee();
    }

    return {
      ...employee,
      hire_date: this.toDateInputValue(employee.hire_date),
    };
  }

  private toDateInputValue(value: string | null): string {
    if (!value) {
      return new Date().toISOString().slice(0, 10);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
  }

  private createEmptyEmployee(): Employee {
    return {
      emp_id: '',
      fname: '',
      minit: null,
      lname: '',
      job_id: 0,
      job_lvl: null,
      pub_id: null,
      hire_date: new Date().toISOString().slice(0, 10),
    };
  }
}
