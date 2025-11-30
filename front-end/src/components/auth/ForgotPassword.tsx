import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

export default function ForgotPasswordForm() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });

  // sample email for demo
  const sampleUser = "demo@fashionhouse.com";
  const sampleCode = "123456";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === 1) {
      if (formData.email === sampleUser) {
        setStep(2);
      } else {
        alert("Email not found in system (sample check)");
      }
    } else if (step === 2) {
      if (formData.code === sampleCode) {
        setStep(3);
      } else {
        alert("Invalid secret code (sample check)");
      }
    } else if (step === 3) {
      if (formData.newPassword && formData.newPassword === formData.confirmPassword) {
        alert("Password reset successful (sample only)");
        setStep(1);
        setFormData({ email: "", code: "", newPassword: "", confirmPassword: "" });
      } else {
        alert("Passwords do not match");
      }
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to Sign In
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8 text-center">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Forgot Password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === 1 && "Enter your registered email to reset your password."}
            {step === 2 && "Check your email and enter the secret code below."}
            {step === 3 && "Set your new password below."}
          </p>
        </div>

        <form onSubmit={handleNext}>
          <div className="space-y-6">
            {/* STEP 1 — EMAIL */}
            {step === 1 && (
              <div>
                <Label>Email <span className="text-error-500">*</span></Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="example@fashionhouse.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* STEP 2 — SECRET CODE */}
            {step === 2 && (
              <div>
                <Label>Secret Code <span className="text-error-500">*</span></Label>
                <Input
                  name="code"
                  type="text"
                  placeholder="Enter the code sent to your email"
                  value={formData.code}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* STEP 3 — NEW PASSWORD */}
            {step === 3 && (
              <>
                <div>
                  <Label>New Password <span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <Input
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={formData.newPassword}
                      onChange={handleChange}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <Label>Confirm Password <span className="text-error-500">*</span></Label>
                  <Input
                    name="confirmPassword"
                    type="password"
                    placeholder="Re-enter new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            <div>
              <Button className="w-full" size="sm">
                {step === 1 ? "Next" : step === 2 ? "Verify Code" : "Reset Password"}
              </Button>
            </div>

            {step > 1 && (
              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="text-sm text-gray-500 hover:underline"
                >
                  ← Back
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
