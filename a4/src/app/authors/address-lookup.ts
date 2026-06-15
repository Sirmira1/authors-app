import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface AddressSuggestion {
  label: string;
  address: string;
  city: string;
  province: string;
}

const PROVINCE_CODES: Record<string, string> = {
  'alberta': 'AB',
  'british columbia': 'BC',
  'manitoba': 'MB',
  'new brunswick': 'NB',
  'newfoundland and labrador': 'NL',
  'nova scotia': 'NS',
  'ontario': 'ON',
  'prince edward island': 'PE',
  'quebec': 'QC',
  'québec': 'QC',
  'saskatchewan': 'SK',
  'northwest territories': 'NT',
  'nunavut': 'NU',
  'yukon': 'YT',
};

interface NominatimResult {
  display_name?: string;
  address?: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class AddressLookupService {
  private readonly url = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) {}

  search(query: string): Observable<AddressSuggestion[]> {
    const trimmed = query.trim();

    if (trimmed.length < 3) {
      return of([]);
    }

    const params = {
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'ca',
      limit: '5',
      q: trimmed,
    };

    return this.http.get<NominatimResult[]>(this.url, { params }).pipe(
      map(results => results
        .map(result => this.toSuggestion(result))
        .filter(suggestion => suggestion.address.length > 0)),
      catchError(() => of([]))
    );
  }

  private toSuggestion(result: NominatimResult): AddressSuggestion {
    const address = result.address ?? {};
    const street = [address['house_number'], address['road']]
      .filter(Boolean)
      .join(' ')
      .trim();
    const city = address['city']
      || address['town']
      || address['village']
      || address['municipality']
      || address['hamlet']
      || '';

    return {
      label: result.display_name ?? street,
      address: this.stripAccents(street),
      city: this.stripAccents(city),
      province: this.toProvinceCode(address),
    };
  }

  private toProvinceCode(address: Record<string, string>): string {
    const iso = address['ISO3166-2-lvl4'];

    if (typeof iso === 'string' && iso.startsWith('CA-')) {
      return iso.slice(3, 5).toUpperCase();
    }

    const stateName = (address['state'] ?? '').toLowerCase();
    return PROVINCE_CODES[stateName] ?? '';
  }

  private stripAccents(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
