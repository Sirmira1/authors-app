import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthorService } from './author';

describe('AuthorService', () => {
  let service: AuthorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
