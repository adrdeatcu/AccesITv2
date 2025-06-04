import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Route } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';

import { AppComponent } from './app/app.component';
import { LoginComponent } from './app/components/login/login.component';
import { GateComponent } from './app/components/gate/gate.component';
import { AdminComponent } from './app/components/admin/admin.component';
import { AccessLogListComponent } from './app/components/access-log-list/access-log-list.component';
import { EmployeeListComponent } from './app/components/employee-list/employee-list.component';
import { RegisterComponent } from './app/components/register/register.component'; // Import RegisterComponent
import { AddVisitorComponent } from './app/components/add-visitor/add-visitor.component'; // Import AddVisitorComponent

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
  { 
    path: 'admin/access-logs', 
    component: AccessLogListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] }
  },
  { 
    path: 'admin/employees', 
    component: EmployeeListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] }
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    canActivate: [AuthGuard, RoleGuard], // Protect with same guards
    data: { roles: ['admin'] }           // Only admin can access
  },
  { 
    path: 'add-visitor', 
    component: AddVisitorComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['portar'] }
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
