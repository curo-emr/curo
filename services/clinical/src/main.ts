import { bootstrapService } from '@curo/shared/bootstrap';
import { AppModule } from './app.module';

void bootstrapService(AppModule, {
  title: 'Curo Clinical Service',
  description: `Encounters, clinical notes, vitals, prescriptions, lab orders & tasks.`,
  defaultPort: 3004,
});
