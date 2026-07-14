import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Author {
  au_id: string;
  au_fname: string;
  au_lname: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  contract: boolean;
}
@Injectable({
  providedIn: 'root',
})

export class AuthorService {
  private apiUrl = 'http://localhost:5232/api/authors';

  constructor(private http: HttpClient) {}

  //get all
  getAuthors(): Observable<Author[]> {
    return this.http.get<Author[]>(this.apiUrl);
  }
  // get by id
  getAuthorById(id: string): Observable<Author> {
    return this.http.get<Author>(`${this.apiUrl}/${id}`);
  }
  // create
  addAuthor(author: Author): Observable<Author> {
    return this.http.post<Author>(this.apiUrl, author);
  }
  // update
  updateAuthor(author: Author): Observable<Author> {
    return this.http.put<Author>(`${this.apiUrl}/${author.au_id}`, author);
  }
  // delete
  deleteAuthor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  // generate unique id
  generateAuthorId(): Observable<{ au_id: string }> {
    return this.http.get<{ au_id: string }>(`${this.apiUrl}/generate/id`);
  }
}
