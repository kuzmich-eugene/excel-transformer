import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { UploadAreaComponent } from './upload-area';

expect.extend(toHaveNoViolations);

describe('UploadAreaComponent — accessibility (axe-core)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('has no critical or serious axe violations in idle state', async () => {
    const { container } = await render(UploadAreaComponent);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders a labelled file input', async () => {
    const { container } = await render(UploadAreaComponent);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    const label = container.querySelector('label[for="invoice-upload"]');
    expect(label).toBeTruthy();
  });
});
