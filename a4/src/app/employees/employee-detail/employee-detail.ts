import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EmployeeService, Employee } from '../employee';

@Component({
  selector: 'app-employee-detail',
  imports: [RouterLink, CommonModule],
  templateUrl: './employee-detail.html',
  styleUrl: './employee-detail.scss',
})
export class EmployeeDetailComponent {
  employee: Employee | undefined;

  constructor(private route: ActivatedRoute, private employeeService: EmployeeService) {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.employeeService.getEmployeeById(id).subscribe({
        next: employee => {
          this.employee = employee;
        },
        error: err => console.error('Error loading employee', err)
      });
    }
  }

  getFullName(employee: Employee): string {
    return [employee.fname, employee.minit, employee.lname].filter(part => part && part.toString().trim()).join(' ');
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  }
}
