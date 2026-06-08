import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AuthorDetailComponent } from './author-detail';

describe('AuthorDetailComponent', () => {
  let component: AuthorDetailComponent;
  let fixture: ComponentFixture<AuthorDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorDetailComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthorDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
