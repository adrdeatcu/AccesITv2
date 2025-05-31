import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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

  constructor(private supabaseService: SupabaseService) {}

  async login() {
    const result = await this.supabaseService.loginUser(this.email, this.password);

    if (result.success && result.user) {
      const userRole = result.user.role;

      if (userRole === 'admin') {
        window.location.href = '/admin';
      } else if (userRole === 'portar') {
        window.location.href = '/gate';
      } else {
        this.loginError = 'Rol necunoscut!';
      }
    } else {
      this.loginError = 'Email sau parolă incorectă';
    }
  }
}
