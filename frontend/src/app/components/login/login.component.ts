import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email = '';
  password = '';
  loginError = '';
  isLoading = false;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async login() {
    if (!this.email || !this.password) {
      this.loginError = 'Te rog completează toate câmpurile';
      return;
    }

    this.isLoading = true;
    this.loginError = '';

    try {
      const result = await this.supabaseService.loginUser(this.email, this.password);

      this.isLoading = false;

      if (result.success && result.user) {
        const userRole = result.user.role;

        if (userRole === 'admin') {
          await this.router.navigate(['/admin']);
        } else if (userRole === 'portar') {
          await this.router.navigate(['/gate']);
        } else {
          this.loginError = `Rol necunoscut: ${userRole}`;
        }
      } else {
        this.loginError = result.error || 'Email sau parolă incorectă';
      }
    } catch (error) {
      this.isLoading = false;
      this.loginError = 'Eroare de conectare. Încearcă din nou.';
    }
  }
}
