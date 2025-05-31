import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GateComponent } from './gate.component';

describe('GateComponent', () => {
  let component: GateComponent;
  let fixture: ComponentFixture<GateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
