import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Title {
  title_id: string;
  title: string;
  type: string;
  pub_id: string | null;
  pub_name?: string | null;
  price: number | null;
  advance: number | null;
  royalty: number | null;
  ytd_sales: number | null;
  notes: string | null;
  pubdate: string;
}
@Injectable({
  providedIn: 'root',
})

export class TitleService {
  private apiUrl = 'http://localhost:3000/api/titles';

  constructor(private http: HttpClient) {}

  //get all
  getTitles(): Observable<Title[]> {
    return this.http.get<Title[]>(this.apiUrl);
  }
  // get by id
  getTitleById(id: string): Observable<Title> {
    return this.http.get<Title>(`${this.apiUrl}/${id}`);
  }
  // create
  addTitle(title: Title): Observable<Title> {
    return this.http.post<Title>(this.apiUrl, title);
  }
  // update
  updateTitle(title: Title): Observable<Title> {
    return this.http.put<Title>(`${this.apiUrl}/${title.title_id}`, title);
  }
  // delete
  deleteTitle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  // generate unique id
  generateTitleId(): Observable<{ title_id: string }> {
    return this.http.get<{ title_id: string }>(`${this.apiUrl}/generate/id`);
  }
}
