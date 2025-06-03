import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Route } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';

import { AppComponent } from './app/app.component';
import { LoginComponent } from './app/components/login/login.component';
import { GateComponent } from './app/components/gate/gate.component';
import { AdminComponent } from './app/components/admin/admin.component';
import { AuthGuard } from './app/guards/auth.guard';
import { RoleGuard } from './app/guards/role.guard';

const routes: Route[] = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'gate', 
    component: GateComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['portar'] }
  },
  { 
    path: 'admin', 
    component: AdminComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] }
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(FormsModule),
    provideAnimations(),
  ]
}).catch((err: unknown) => console.error(err));
