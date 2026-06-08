import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AuthorEditComponent } from './author-edit';

describe('AuthorEditComponent', () => {
  let component: AuthorEditComponent;
  let fixture: ComponentFixture<AuthorEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorEditComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthorEditComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
