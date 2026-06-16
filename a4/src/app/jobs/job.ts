import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Job {
  job_id: number;
  job_desc: string;
  min_lvl: number;
  max_lvl: number;
}
@Injectable({
  providedIn: 'root',
})

export class JobService {
  private apiUrl = 'http://localhost:3000/api/jobs';

  constructor(private http: HttpClient) {}

  //get all
  getJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(this.apiUrl);
  }
  // get by id
  getJobById(id: number): Observable<Job> {
    return this.http.get<Job>(`${this.apiUrl}/${id}`);
  }
  // create
  addJob(job: Job): Observable<Job> {
    return this.http.post<Job>(this.apiUrl, job);
  }
  // update
  updateJob(job: Job): Observable<Job> {
    return this.http.put<Job>(`${this.apiUrl}/${job.job_id}`, job);
  }
  // delete
  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
