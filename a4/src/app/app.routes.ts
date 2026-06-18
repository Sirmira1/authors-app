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

export const routes: Routes = [
  { path: '', redirectTo: 'authors', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'forbidden', component: ForbiddenComponent },
  { path: 'authors', component: AuthorListComponent },
  { path: 'authors/new', component: AuthorCreateComponent },
  { path: 'authors/edit/:id', component: AuthorEditComponent },
  { path: 'authors/:id', component: AuthorDetailComponent },
  { path: 'publishers', component: PublisherListComponent },
  { path: 'publishers/new', component: PublisherCreateComponent },
  { path: 'publishers/edit/:id', component: PublisherEditComponent },
  { path: 'publishers/:id', component: PublisherDetailComponent },
  { path: 'jobs', component: JobListComponent, canActivate: [managementGuard] },
  { path: 'jobs/new', component: JobCreateComponent, canActivate: [managementGuard] },
  { path: 'jobs/edit/:id', component: JobEditComponent, canActivate: [managementGuard] },
  { path: 'jobs/:id', component: JobDetailComponent, canActivate: [managementGuard] },
  { path: 'titles', component: TitleListComponent },
  { path: 'titles/new', component: TitleCreateComponent },
  { path: 'titles/edit/:id', component: TitleEditComponent },
  { path: 'titles/:id', component: TitleDetailComponent },
  { path: 'employees', component: EmployeeListComponent, canActivate: [managementGuard] },
  { path: 'employees/new', component: EmployeeCreateComponent, canActivate: [managementGuard] },
  { path: 'employees/edit/:id', component: EmployeeEditComponent, canActivate: [managementGuard] },
  { path: 'employees/:id', component: EmployeeDetailComponent, canActivate: [managementGuard] },
  { path: 'sales', component: SaleListComponent },
  { path: 'sales/new', component: SaleCreateComponent },
  { path: 'sales/edit/:storId/:ordNum', component: SaleEditComponent },
  { path: 'sales/:storId/:ordNum', component: SaleDetailComponent }
];