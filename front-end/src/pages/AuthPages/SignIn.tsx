import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
      title="Fashion House SignIn "
      description="This is the Fashion House SignIn page."
      />
      <AuthLayout>
      <SignInForm />
      </AuthLayout>
    </>
  );
}
