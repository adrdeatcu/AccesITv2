import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-access-log-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './access-log-list.component.html',
  styleUrls: ['./access-log-list.component.css']
})
export class AccessLogListComponent implements OnInit {
  accessLogs: any[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    try {
      this.accessLogs = await this.supabaseService.getAllAccessLogs();
    } catch (err) {
      this.error = 'Failed to load access logs';
    } finally {
      this.isLoading = false;
    }
  }
}
