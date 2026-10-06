import { bootstrapService } from '@curo/shared/bootstrap';
import { AppModule } from './app.module';

void bootstrapService(AppModule, {
  title: 'Curo Audit Service',
  description: `Audit-log write & query.`,
  defaultPort: 3008,
});
