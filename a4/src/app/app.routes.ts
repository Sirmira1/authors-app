import { Routes } from '@angular/router';
import { AuthorListComponent } from './authors/author-list/author-list';
import { AuthorCreateComponent } from './authors/author-create/author-create';
import { AuthorEditComponent } from './authors/author-edit/author-edit';
import { AuthorDetailComponent } from './authors/author-detail/author-detail';
import { PublisherListComponent } from './publishers/publisher-list/publisher-list';
import { PublisherCreateComponent } from './publishers/publisher-create/publisher-create';
import { PublisherEditComponent } from './publishers/publisher-edit/publisher-edit';
import { PublisherDetailComponent } from './publishers/publisher-detail/publisher-detail';
import { JobListComponent } from './jobs/job-list/job-list';
import { JobCreateComponent } from './jobs/job-create/job-create';
import { JobEditComponent } from './jobs/job-edit/job-edit';
import { JobDetailComponent } from './jobs/job-detail/job-detail';
import { TitleListComponent } from './titles/title-list/title-list';
import { TitleCreateComponent } from './titles/title-create/title-create';
import { TitleEditComponent } from './titles/title-edit/title-edit';
import { TitleDetailComponent } from './titles/title-detail/title-detail';
import { EmployeeListComponent } from './employees/employee-list/employee-list';
import { EmployeeCreateComponent } from './employees/employee-create/employee-create';
import { EmployeeEditComponent } from './employees/employee-edit/employee-edit';
import { EmployeeDetailComponent } from './employees/employee-detail/employee-detail';
import { SaleListComponent } from './sales/sale-list/sale-list';
import { SaleCreateComponent } from './sales/sale-create/sale-create';
import { SaleEditComponent } from './sales/sale-edit/sale-edit';
import { SaleDetailComponent } from './sales/sale-detail/sale-detail';
import { LoginComponent } from './auth/login/login';
import { ForbiddenComponent } from './auth/forbidden/forbidden';
import { managementGuard } from './auth/management-guard';
import { salesGuard } from './auth/sales-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'authors', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, title: 'Sign In · Pubs Management Portal' },
  { path: 'forbidden', component: ForbiddenComponent, title: 'Access Restricted · Pubs Management Portal' },
  { path: 'authors', component: AuthorListComponent, title: 'Authors · Pubs Management Portal' },
  { path: 'authors/new', component: AuthorCreateComponent, title: 'Register Author · Pubs Management Portal' },
  { path: 'authors/edit/:id', component: AuthorEditComponent, title: 'Edit Author · Pubs Management Portal' },
  { path: 'authors/:id', component: AuthorDetailComponent, title: 'Author Details · Pubs Management Portal' },
  { path: 'publishers', component: PublisherListComponent, title: 'Publishers · Pubs Management Portal' },
  { path: 'publishers/new', component: PublisherCreateComponent, title: 'Register Publisher · Pubs Management Portal' },
  { path: 'publishers/edit/:id', component: PublisherEditComponent, title: 'Edit Publisher · Pubs Management Portal' },
  { path: 'publishers/:id', component: PublisherDetailComponent, title: 'Publisher Details · Pubs Management Portal' },
  { path: 'jobs', component: JobListComponent, canActivate: [managementGuard], title: 'Jobs · Pubs Management Portal' },
  { path: 'jobs/new', component: JobCreateComponent, canActivate: [managementGuard], title: 'Register Job · Pubs Management Portal' },
  { path: 'jobs/edit/:id', component: JobEditComponent, canActivate: [managementGuard], title: 'Edit Job · Pubs Management Portal' },
  { path: 'jobs/:id', component: JobDetailComponent, canActivate: [managementGuard], title: 'Job Details · Pubs Management Portal' },
  { path: 'titles', component: TitleListComponent, title: 'Titles · Pubs Management Portal' },
  { path: 'titles/new', component: TitleCreateComponent, title: 'Register Title · Pubs Management Portal' },
  { path: 'titles/edit/:id', component: TitleEditComponent, title: 'Edit Title · Pubs Management Portal' },
  { path: 'titles/:id', component: TitleDetailComponent, title: 'Title Details · Pubs Management Portal' },
  { path: 'employees', component: EmployeeListComponent, canActivate: [managementGuard], title: 'Employees · Pubs Management Portal' },
  { path: 'employees/new', component: EmployeeCreateComponent, canActivate: [managementGuard], title: 'Register Employee · Pubs Management Portal' },
  { path: 'employees/edit/:id', component: EmployeeEditComponent, canActivate: [managementGuard], title: 'Edit Employee · Pubs Management Portal' },
  { path: 'employees/:id', component: EmployeeDetailComponent, canActivate: [managementGuard], title: 'Employee Details · Pubs Management Portal' },
  { path: 'sales', component: SaleListComponent, canActivate: [salesGuard], title: 'Sales · Pubs Management Portal' },
  { path: 'sales/new', component: SaleCreateComponent, canActivate: [salesGuard], title: 'Register Sale · Pubs Management Portal' },
  { path: 'sales/edit/:storId/:ordNum', component: SaleEditComponent, canActivate: [salesGuard], title: 'Edit Sale · Pubs Management Portal' },
  { path: 'sales/:storId/:ordNum', component: SaleDetailComponent, canActivate: [salesGuard], title: 'Sale Details · Pubs Management Portal' }
];