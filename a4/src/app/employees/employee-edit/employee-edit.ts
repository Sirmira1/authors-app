import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmployeeService, Employee } from '../employee';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeFormComponent } from '../employee-form/employee-form';

@Component({
  selector: 'app-employee-edit',
  imports: [CommonModule, EmployeeFormComponent],
  templateUrl: './employee-edit.html',
  styleUrl: './employee-edit.scss',
})
export class EmployeeEditComponent {
  employee: Employee | undefined;
  employeeId: string | null = null;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.employeeId = this.route.snapshot.paramMap.get('id');
    if (this.employeeId) {
      this.employeeService.getEmployeeById(this.employeeId).subscribe({
        next: employee => {
          this.errorMessage = '';
          this.employee = employee;
        },
        error: err => {
          this.errorMessage = 'Could not load employee details.';
          console.error('Error loading employee', err);
        }
      });
    }
  }

  saveEmployee(employeePayload: Employee): void {
    if (!this.employeeId) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.employeeService.updateEmployee({ ...employeePayload, emp_id: this.employeeId }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.router.navigate(['/employees'], { queryParams: { success: 'updated' } });
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          if (err?.error?.error) {
            this.errorMessage = `Could not update employee: ${err.error.error}.`;
          } else {
            this.errorMessage = 'Could not update employee. Check the field values and try again.';
          }
        });
        console.error('Error updating employee', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/employees']);
  }
}
