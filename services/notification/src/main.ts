import { bootstrapService } from '@curo/shared/bootstrap';
import { AppModule } from './app.module';

void bootstrapService(AppModule, {
  title: 'Curo Notification Service',
  description: `Each user's notification inbox. The services raise notifications; no API creates them.`,
  defaultPort: 3007,
});
