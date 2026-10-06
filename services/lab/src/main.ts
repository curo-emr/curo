import { bootstrapService } from '@curo/shared/bootstrap';
import { AppModule } from './app.module';

void bootstrapService(AppModule, {
  title: 'Curo Lab Service',
  description: `Lab orders, per-test QR scanning, results, diagnostic reports & instruments.`,
  defaultPort: 3006,
});
