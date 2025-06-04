import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.css']
})
export class EmployeeListComponent implements OnInit {
  employees: any[] = [];
  isLoading = true;
  isDeleting: string | null = null;
  error: string | null = null;
  employeeToDelete: any = null;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    await this.loadEmployees();
  }

  async loadEmployees() {
    this.isLoading = true;
    this.error = null;
    
    try {
      this.employees = await this.supabaseService.getAllEmployees();
    } catch (err) {
      this.error = 'Nu s-au putut încărca datele angajaților';
    } finally {
      this.isLoading = false;
    }
  }

  confirmDelete(employee: any) {
    this.employeeToDelete = employee;
  }

  async deleteEmployee(employeeId: string) {
    this.isDeleting = employeeId;
    
    try {
      const result = await this.supabaseService.deleteEmployee(employeeId);
      
      if (result.success) {
        // Remove from the local list
        this.employees = this.employees.filter(emp => emp.id !== employeeId);
        this.employeeToDelete = null;
      } else {
        this.error = result.error || 'A apărut o eroare la ștergerea angajatului';
      }
    } catch (err: any) {
      this.error = err.message || 'A apărut o eroare la ștergerea angajatului';
    } finally {
      this.isDeleting = null;
    }
  }
}
