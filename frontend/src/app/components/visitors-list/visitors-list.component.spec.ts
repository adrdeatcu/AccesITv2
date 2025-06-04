import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitorsListComponent } from './visitors-list.component';

describe('VisitorsListComponent', () => {
  let component: VisitorsListComponent;
  let fixture: ComponentFixture<VisitorsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitorsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisitorsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
