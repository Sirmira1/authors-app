import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Employee {
  emp_id: string;
  fname: string;
  minit: string | null;
  lname: string;
  job_id: number;
  job_desc?: string | null;
  job_lvl: number | null;
  pub_id: string | null;
  pub_name?: string | null;
  hire_date: string;
}
@Injectable({
  providedIn: 'root',
})

export class EmployeeService {
  private apiUrl = 'http://localhost:5232/api/employees';

  constructor(private http: HttpClient) {}

  //get all
  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.apiUrl);
  }
  // get by id
  getEmployeeById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`);
  }
  // create
  addEmployee(employee: Employee): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, employee);
  }
  // update
  updateEmployee(employee: Employee): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/${employee.emp_id}`, employee);
  }
  // delete
  deleteEmployee(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  // generate unique id
  generateEmployeeId(): Observable<{ emp_id: string }> {
    return this.http.get<{ emp_id: string }>(`${this.apiUrl}/generate/id`);
  }
}
