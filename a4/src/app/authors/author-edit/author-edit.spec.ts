import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthorEdit } from './author-edit';

describe('AuthorEdit', () => {
  let component: AuthorEdit;
  let fixture: ComponentFixture<AuthorEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthorEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
