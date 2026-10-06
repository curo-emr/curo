import { bootstrapService } from '@curo/shared/bootstrap';
import { AppModule } from './app.module';

void bootstrapService(AppModule, {
  title: 'Curo Pharmacy Service',
  description: `Pharmacy stock (FEFO multi-batch) & dispensing.`,
  defaultPort: 3005,
});
