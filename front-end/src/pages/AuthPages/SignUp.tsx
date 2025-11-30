import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Fashion House — Sign Up"
        description="Create your Fashion House account to access exclusive styles, offers and manage your wardrobe."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
