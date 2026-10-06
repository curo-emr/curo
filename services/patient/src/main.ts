import { bootstrapService } from '@curo/shared/bootstrap';
import { AppModule } from './app.module';

void bootstrapService(AppModule, {
  title: 'Curo Patient Service',
  description: `Patient demographics, allergies, conditions & vitals (FHIR-shaped).`,
  defaultPort: 3002,
});
