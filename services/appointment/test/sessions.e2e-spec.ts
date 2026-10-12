import { UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';

// Every service checks the account behind a token through the shared guard,
// so ending sessions in the auth service ends them here too, at once.
describe('Ended sessions', () => {
  let svc: ServiceUnderTest;
  let receptionist: TestActor;

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  beforeEach(async () => {
    receptionist = await svc.as(UserRole.RECEPTIONIST);
    await appointments().expect(200);
  });

  afterAll(() => svc.close());

  const appointments = () =>
    svc.api.get('/appointments').set(receptionist.headers);

  /** Changes the receptionist's account the way the auth service would. */
  const account = (change: string) =>
    svc.db.query(`UPDATE users SET ${change} WHERE id = $1`, [
      receptionist.sub,
    ]);

  it('refuses a token once its account is suspended', async () => {
    await account('"isActive" = false');

    await appointments().expect(401);
  });

  it("refuses a token signed in before the account's sessions were ended", async () => {
    await account(`"sessionsEndedAt" = now() + interval '1 second'`);

    await appointments().expect(401);
  });

  it('refuses a token whose account is gone', async () => {
    await svc.db.query('DELETE FROM users WHERE id = $1', [receptionist.sub]);

    await appointments().expect(401);
  });
});
