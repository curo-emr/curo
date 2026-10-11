import { PasswordHelp } from "@curo/web/shell";
import { RECEPTION, ROUTES } from "@/lib/constants";

export default function ForgotPasswordPage() {
  return <PasswordHelp signInHref={ROUTES.LOGIN} contact={RECEPTION} />;
}
