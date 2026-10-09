import { PasswordHelp } from "@curo/web/shell";
import { ROUTES } from "@/lib/constants";

export default function ForgotPasswordPage() {
  return <PasswordHelp signInHref={ROUTES.LOGIN} />;
}
