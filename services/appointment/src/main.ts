import { bootstrapService } from '@curo/shared/bootstrap';
import { AppModule } from './app.module';

void bootstrapService(AppModule, {
  title: 'Curo Appointment Service',
  description: `Appointment scheduling & payment collection.`,
  defaultPort: 3003,
});
