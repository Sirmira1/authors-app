import { Routes } from '@angular/router';
import { AuthorListComponent } from './authors/author-list/author-list';
import { AuthorCreateComponent } from './authors/author-create/author-create';
import { AuthorEditComponent } from './authors/author-edit/author-edit';
import { AuthorDetailComponent } from './authors/author-detail/author-detail';

export const routes: Routes = [
  { path: '', redirectTo: 'authors', pathMatch: 'full' },
  { path: 'authors', component: AuthorListComponent },
  { path: 'authors/new', component: AuthorCreateComponent },
  { path: 'authors/edit/:id', component: AuthorEditComponent },
  { path: 'authors/:id', component: AuthorDetailComponent }
];