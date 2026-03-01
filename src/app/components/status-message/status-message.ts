import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConversionStateService } from '../../services/conversion-state.service';

@Component({
  selector: 'app-status-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-message.html',
})
export class StatusMessageComponent {
  protected readonly state = inject(ConversionStateService);
}
