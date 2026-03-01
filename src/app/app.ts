import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UploadAreaComponent } from './components/upload-area/upload-area';
import { StatusMessageComponent } from './components/status-message/status-message';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UploadAreaComponent, StatusMessageComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
