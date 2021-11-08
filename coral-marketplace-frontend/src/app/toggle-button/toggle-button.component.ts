import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss']
})
export class ToggleButtonComponent {
  @Output() changed = new EventEmitter<boolean>();
  @Input() checked: boolean;

  emitEvent(event: any) {
    this.changed.emit(event.target.checked)
  }
}
