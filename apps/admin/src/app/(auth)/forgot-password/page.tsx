import { PasswordHelp } from "@curo/web/shell";
import { ROUTES } from "@/lib/constants";

// Super admins reset each other's passwords; there's no one else to ask.
export default function ForgotPasswordPage() {
  return <PasswordHelp signInHref={ROUTES.LOGIN} contact="another super admin" />;
}
