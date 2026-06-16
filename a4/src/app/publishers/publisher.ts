import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Publisher {
  pub_id: string;
  pub_name: string;
  city: string;
  state: string;
  country: string;
}
@Injectable({
  providedIn: 'root',
})

export class PublisherService {
  private apiUrl = 'http://localhost:3000/api/publishers';

  constructor(private http: HttpClient) {}

  //get all
  getPublishers(): Observable<Publisher[]> {
    return this.http.get<Publisher[]>(this.apiUrl);
  }
  // get by id
  getPublisherById(id: string): Observable<Publisher> {
    return this.http.get<Publisher>(`${this.apiUrl}/${id}`);
  }
  // create
  addPublisher(publisher: Publisher): Observable<Publisher> {
    return this.http.post<Publisher>(this.apiUrl, publisher);
  }
  // update
  updatePublisher(publisher: Publisher): Observable<Publisher> {
    return this.http.put<Publisher>(`${this.apiUrl}/${publisher.pub_id}`, publisher);
  }
  // delete
  deletePublisher(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  // generate unique id
  generatePublisherId(): Observable<{ pub_id: string }> {
    return this.http.get<{ pub_id: string }>(`${this.apiUrl}/generate/id`);
  }
}
