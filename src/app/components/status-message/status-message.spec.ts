import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { StatusMessageComponent } from './status-message';
import { ConversionStateService } from '../../services/conversion-state.service';

expect.extend(toHaveNoViolations);

describe('StatusMessageComponent — accessibility (axe-core)', () => {
  it('has no violations in loading state', async () => {
    const stateService = new ConversionStateService();
    stateService.startProcessing();
    const { container } = await render(StatusMessageComponent, {
      providers: [{ provide: ConversionStateService, useValue: stateService }],
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders role=status in loading state', async () => {
    const stateService = new ConversionStateService();
    stateService.startProcessing();
    const { container } = await render(StatusMessageComponent, {
      providers: [{ provide: ConversionStateService, useValue: stateService }],
    });
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

  it('has no violations in error state', async () => {
    const stateService = new ConversionStateService();
    stateService.setError('The file is missing the required sheet.');
    const { container } = await render(StatusMessageComponent, {
      providers: [{ provide: ConversionStateService, useValue: stateService }],
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders role=alert in error state', async () => {
    const stateService = new ConversionStateService();
    stateService.setError('Something went wrong.');
    const { container } = await render(StatusMessageComponent, {
      providers: [{ provide: ConversionStateService, useValue: stateService }],
    });
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('displays the error message text', async () => {
    const stateService = new ConversionStateService();
    const msg = "The file is missing the required 'Спецификация' sheet.";
    stateService.setError(msg);
    const { container } = await render(StatusMessageComponent, {
      providers: [{ provide: ConversionStateService, useValue: stateService }],
    });
    expect(container.textContent).toContain(msg);
  });

  it('has no violations in success state', async () => {
    const stateService = new ConversionStateService();
    stateService.setSuccess({ totalRowsInSheet: 5, skippedRows: 0, exportedRows: 5 });
    const { container } = await render(StatusMessageComponent, {
      providers: [{ provide: ConversionStateService, useValue: stateService }],
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders nothing in idle state', async () => {
    const stateService = new ConversionStateService();
    const { container } = await render(StatusMessageComponent, {
      providers: [{ provide: ConversionStateService, useValue: stateService }],
    });
    expect(container.querySelector('[role]')).toBeNull();
  });
});
