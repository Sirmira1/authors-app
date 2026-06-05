import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthorCreate } from './author-create';

describe('AuthorCreate', () => {
  let component: AuthorCreate;
  let fixture: ComponentFixture<AuthorCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthorCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
