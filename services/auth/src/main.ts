import { bootstrapService } from '@curo/shared/bootstrap';
import { AppModule } from './app.module';

void bootstrapService(AppModule, {
  title: 'Curo Auth Service',
  description: `Authentication, users, practitioners & organization directory.`,
  defaultPort: 3001,
});
