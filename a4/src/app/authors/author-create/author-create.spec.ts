import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AuthorCreateComponent } from './author-create';

describe('AuthorCreateComponent', () => {
  let component: AuthorCreateComponent;
  let fixture: ComponentFixture<AuthorCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorCreateComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthorCreateComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
