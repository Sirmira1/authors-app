import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'authors/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'authors/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'publishers/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'publishers/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'jobs/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'jobs/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'titles/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'titles/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'employees/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'employees/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'sales/edit/:storId/:ordNum',
    renderMode: RenderMode.Server
  },
  {
    path: 'sales/:storId/:ordNum',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
