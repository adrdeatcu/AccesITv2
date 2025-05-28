import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  loginError = '';

  login() {
    if (this.email === 'admin@example.com' && this.password === 'placeholder') {
      alert('Autentificat cu succes!');
    } else {
      this.loginError = 'Email sau parolă incorectă';
    }
  }
}
