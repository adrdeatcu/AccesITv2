import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // ✅ Import this
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule // ✅ Add this to support routerLink
  ],
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.css']
})
export class EmployeeListComponent implements OnInit {
  employees: any[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    try {
      this.employees = await this.supabaseService.getAllEmployees();
    } catch (err) {
      this.error = 'Failed to load employee data';
    } finally {
      this.isLoading = false;
    }
  }
}
