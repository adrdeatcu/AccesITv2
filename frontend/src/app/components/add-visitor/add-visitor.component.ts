import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-add-visitor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './add-visitor.component.html',
  styleUrls: ['./add-visitor.component.css']
})
export class AddVisitorComponent {
  visitorForm: FormGroup;
  isSubmitting = false;
  error = '';
  success = '';
  minDate: string;
  minEndDate: string;
  
  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    // Set minimum date to today
    const now = new Date();
    this.minDate = now.toISOString().split('T')[0];
    this.minEndDate = now.toISOString().split('T')[0];
    
    this.visitorForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      license_plate: ['', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(5)]],
      ble_temp_code: ['VIS-' + Math.floor(Math.random() * 900000 + 100000), Validators.required],
      access_start: [this.formatDateTimeForInput(now), Validators.required],
      access_end: [this.formatDateTimeForInput(new Date(now.getTime() + 3600000)), Validators.required]
    });

    // Update minimum end date when start date changes
    this.visitorForm.get('access_start')?.valueChanges.subscribe(val => {
      if (val) {
        this.minEndDate = val;
        
        // If current end date is before new start date, update it
        const endDateControl = this.visitorForm.get('access_end');
        if (endDateControl && endDateControl.value < val) {
          // Set end date to 1 hour after start date
          const startDate = new Date(val);
          endDateControl.setValue(this.formatDateTimeForInput(new Date(startDate.getTime() + 3600000)));
        }
      }
    });
  }

  formatDateTimeForInput(date: Date): string {
    // Format date as YYYY-MM-DDThh:mm
    return date.toISOString().substring(0, 16);
  }

  async onSubmit() {
    if (this.visitorForm.invalid) {
      Object.keys(this.visitorForm.controls).forEach(key => {
        const control = this.visitorForm.get(key);
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
      // Format dates to ISO string
      const formData = {...this.visitorForm.value};
      formData.access_start = new Date(formData.access_start).toISOString();
      formData.access_end = new Date(formData.access_end).toISOString();
      
      const result = await this.supabaseService.addVisitor(formData);
      if (result.success) {
        this.success = 'Vizitator înregistrat cu succes!';
        
        // Reset form but keep generated BLE code
        const newBleCode = 'VIS-' + Math.floor(Math.random() * 900000 + 100000);
        this.visitorForm.reset({
          ble_temp_code: newBleCode,
          access_start: this.formatDateTimeForInput(new Date()),
          access_end: this.formatDateTimeForInput(new Date(Date.now() + 3600000))
        });
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
    this.router.navigate(['/gate']);
  }
}
