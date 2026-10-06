import { bootstrapService } from '@curo/shared/bootstrap';
import { AppModule } from './app.module';

void bootstrapService(AppModule, {
  title: 'Curo Document Service',
  description: `Patient document upload & retrieval.`,
  defaultPort: 3009,
});
