import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Route } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';

import { AppComponent } from './app/app.component';
import { LoginComponent } from './app/components/login/login.component';
import { GateComponent } from './app/components/gate/gate.component'; // ✅ Add this import

const routes: Route[] = [
  { path: 'login', component: LoginComponent },
  { path: 'gate', component: GateComponent }, // ✅ Add the gate route
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // make sure this stays last
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(FormsModule),
    provideAnimations(),
  ]
}).catch((err: unknown) => console.error(err));
