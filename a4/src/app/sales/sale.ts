import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Store {
  stor_id: string;
  stor_name: string | null;
}

export interface Sale {
  stor_id: string;
  stor_name?: string | null;
  ord_num: string;
  ord_date: string;
  qty: number;
  payterms: string;
  title_id: string;
  title?: string | null;
}
@Injectable({
  providedIn: 'root',
})

export class SaleService {
  private apiUrl = 'http://localhost:5232/api/sales';
  private storesUrl = 'http://localhost:5232/api/stores';

  constructor(private http: HttpClient) {}

  //get all
  getSales(): Observable<Sale[]> {
    return this.http.get<Sale[]>(this.apiUrl);
  }
  // get by composite key
  getSaleByKey(storId: string, ordNum: string): Observable<Sale> {
    return this.http.get<Sale>(`${this.apiUrl}/${encodeURIComponent(storId)}/${encodeURIComponent(ordNum)}`);
  }
  // create
  addSale(sale: Sale): Observable<Sale> {
    return this.http.post<Sale>(this.apiUrl, sale);
  }
  // update
  updateSale(sale: Sale): Observable<Sale> {
    return this.http.put<Sale>(`${this.apiUrl}/${encodeURIComponent(sale.stor_id)}/${encodeURIComponent(sale.ord_num)}`, sale);
  }
  // delete
  deleteSale(storId: string, ordNum: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${encodeURIComponent(storId)}/${encodeURIComponent(ordNum)}`);
  }
  // stores lookup
  getStores(): Observable<Store[]> {
    return this.http.get<Store[]>(this.storesUrl);
  }
}
