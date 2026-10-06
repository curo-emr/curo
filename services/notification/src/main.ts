import { bootstrapService } from '@curo/shared/bootstrap';
import { AppModule } from './app.module';

void bootstrapService(AppModule, {
  title: 'Curo Notification Service',
  description: `User notifications.`,
  defaultPort: 3007,
});
