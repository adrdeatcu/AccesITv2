import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  isSubmitting = false;
  error = '';
  success = '';
  scheduleOptions = ['08:00-16:00', '09:00-17:00', '10:00-18:00', '12:00-20:00'];
  
  // Updated to match the database IDs directly
  divisionOptions = [
    { id: 1, name: 'IT' },
    { id: 2, name: 'HR' },
    { id: 3, name: 'Finance' },
    { id: 4, name: 'Operations' }
  ];

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required], // Add this line
      badge_number: ['', Validators.required],
      bluetooth_code: ['', Validators.required],
      allowed_schedule: ['08:00-16:00', Validators.required],
      division: ['', Validators.required],
      photo_url: [''],
      access_enabled: [true]
    });
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.isSubmitting = true;
    this.error = '';
    this.success = '';

    try {
      const result = await this.supabaseService.registerUser(this.registerForm.value);
      if (result.success) {
        this.success = 'Utilizator înregistrat cu succes!';
        this.registerForm.reset({
          role: 'employee',
          allowed_schedule: this.scheduleOptions[0],
          access_enabled: true
        });
        
        // Don't navigate away - stay on this page to show success message
        // and allow the admin to register more users if needed
      } else {
        this.error = result.error || 'A apărut o eroare la înregistrare.';
      }
    } catch (err: any) {
      this.error = err.message || 'A apărut o eroare la înregistrare.';
    } finally {
      this.isSubmitting = false;
    }
  }

  navigateBack() {
    this.router.navigate(['/admin']);
  }
}

