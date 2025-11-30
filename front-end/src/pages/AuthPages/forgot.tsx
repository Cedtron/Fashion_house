import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";

import ForgotPasswordForm from "../../components/auth/ForgotPassword";

export default function Forgot() {
  return (
    <>
      <PageMeta
        title="Forgot Password | Fashion House"
        description="Reset your Fashion House account password"
      />
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </>
  );
}
