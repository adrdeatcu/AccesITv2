import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-visitors-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './visitors-list.component.html',
  styleUrl: './visitors-list.component.css'
})
export class VisitorsListComponent implements OnInit {
  visitors: any[] = [];
  isLoading = true;
  error: string | null = null;
  
  isDeleting: string | null = null;
  visitorToDelete: any = null;
  
  constructor(private supabaseService: SupabaseService) {}
  
  async ngOnInit() {
    await this.loadVisitors();
  }
  
  async loadVisitors() {
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await fetch('http://localhost:3000/admin/visitors');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Nu s-au putut încărca vizitatorii');
      }
      
      this.visitors = data.visitors;
    } catch (error: any) {
      this.error = error.message || 'Nu s-au putut încărca vizitatorii';
      console.error('Failed to load visitors:', error);
    } finally {
      this.isLoading = false;
    }
  }

  isActive(start: string, end: string): boolean {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    return startDate <= now && now <= endDate;
  }

  isExpired(end: string): boolean {
    const now = new Date();
    const endDate = new Date(end);
    return now > endDate;
  }

  isUpcoming(start: string): boolean {
    const now = new Date();
    const startDate = new Date(start);
    return now < startDate;
  }

  getStatusText(start: string, end: string): string {
    if (this.isActive(start, end)) {
      return 'Activ';
    } else if (this.isExpired(end)) {
      return 'Expirat';
    } else {
      return 'Programat';
    }
  }

  confirmDelete(visitor: any) {
    this.visitorToDelete = visitor;
  }

  async deleteVisitor(visitorId: number) {
    this.isDeleting = visitorId.toString();
    
    try {
      const response = await fetch(`http://localhost:3000/admin/visitors/${visitorId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Nu s-a putut șterge vizitatorul');
      }
      
      // Remove from the local list
      this.visitors = this.visitors.filter(v => v.id !== visitorId);
      this.visitorToDelete = null;
    } catch (error: any) {
      this.error = error.message || 'Nu s-a putut șterge vizitatorul';
      console.error('Failed to delete visitor:', error);
    } finally {
      this.isDeleting = null;
    }
  }
}
