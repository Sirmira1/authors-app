import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EmployeeService, Employee } from '../employee';
import { EmployeeFormComponent } from '../employee-form/employee-form';

@Component({
  selector: 'app-employee-create',
  imports: [EmployeeFormComponent],
  templateUrl: './employee-create.html',
  styleUrl: './employee-create.scss',
})
export class EmployeeCreateComponent implements OnInit {
  private readonly maxIdGenerationRetries = 3;

  isSubmitting = false;
  errorMessage = '';

  employee: Employee = {
    emp_id: '',
    fname: '',
    minit: null,
    lname: '',
    job_id: 0,
    job_lvl: null,
    pub_id: null,
    hire_date: new Date().toISOString().slice(0, 10)
  };

  constructor(
    private employeeService: EmployeeService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.generateEmployeeId();
  }

  generateEmployeeId(attempt = 1): void {
    this.employeeService.generateEmployeeId().subscribe({
      next: (response) => {
        this.employee = {
          ...this.employee,
          emp_id: response.emp_id,
        };
        this.errorMessage = '';
      },
      error: err => {
        if (attempt < this.maxIdGenerationRetries) {
          setTimeout(() => this.generateEmployeeId(attempt + 1), 300);
          return;
        }

        this.errorMessage = 'Could not generate employee ID. Please refresh and try again.';
        console.error('Error generating employee id:', err);
      }
    });
  }

  createEmployee(employeePayload: Employee): void {
    if (!employeePayload.emp_id?.trim()) {
      this.errorMessage = 'Employee ID is still being generated. Please wait a moment and try again.';
      this.generateEmployeeId();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.employeeService.addEmployee(employeePayload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.router.navigate(['/employees'], { queryParams: { success: 'created' } });
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          if (err?.error?.error) {
            this.errorMessage = `Could not create employee: ${err.error.error}.`;
          } else {
            this.errorMessage = 'Could not create employee. Check the field values and try again.';
          }
        });
        console.error('Error creating employee', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/employees']);
  }
}
