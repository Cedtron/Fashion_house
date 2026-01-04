import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "react-toastify";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import api from "../../utils/axios";

export default function ForgotPasswordForm() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (step === 1) {
        // Step 1: Request reset code
        if (!formData.email) {
          toast.error("Please enter your email address");
          return;
        }

        const response = await api.post('/users/forgot-password', {
          email: formData.email
        });

        toast.success("Reset code sent to your email!");
        setStep(2);

      } else if (step === 2) {
        // Step 2: Verify reset code
        if (!formData.code) {
          toast.error("Please enter the verification code");
          return;
        }

        const response = await api.post('/users/verify-reset-code', {
          email: formData.email,
          code: formData.code
        });

        if (response.data.valid) {
          toast.success("Code verified successfully!");
          setStep(3);
        }

      } else if (step === 3) {
        // Step 3: Reset password
        if (!formData.newPassword) {
          toast.error("Please enter a new password");
          return;
        }

        if (formData.newPassword.length < 6) {
          toast.error("Password must be at least 6 characters long");
          return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }

        const response = await api.post('/users/reset-password', {
          email: formData.email,
          code: formData.code,
          newPassword: formData.newPassword
        });

        toast.success("Password reset successfully!");
        
        // Reset form and redirect to login
        setFormData({ email: "", code: "", newPassword: "", confirmPassword: "" });
        setStep(1);
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/signin');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await api.post('/users/forgot-password', {
        email: formData.email
      });
      toast.success("New code sent to your email!");
    } catch (error: any) {
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setLoading(false);
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
                  placeholder="Enter your registered email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  We'll send a 6-digit verification code to this email.
                </p>
              </div>
            )}

            {/* STEP 2 — SECRET CODE */}
            {step === 2 && (
              <div>
                <Label>Verification Code <span className="text-error-500">*</span></Label>
                <Input
                  name="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={formData.code}
                  onChange={handleChange}
                  maxLength={6}
                  required
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Code sent to {formData.email}
                  </p>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                </div>
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
                      placeholder="Enter new password (min 6 characters)"
                      value={formData.newPassword}
                      onChange={handleChange}
                      minLength={6}
                      required
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
                    minLength={6}
                    required
                  />
                </div>
              </>
            )}

            <div>
              <Button 
                className="w-full" 
                size="sm" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    {step === 1 ? "Send Reset Code" : step === 2 ? "Verify Code" : "Reset Password"}
                  </>
                )}
              </Button>
            </div>

            {step > 1 && (
              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="text-sm text-gray-500 hover:underline disabled:opacity-50"
                >
                  ← Back
                </button>
              </div>
            )}

            {/* Progress indicator */}
            <div className="flex justify-center mt-6">
              <div className="flex space-x-2">
                {[1, 2, 3].map((stepNumber) => (
                  <div
                    key={stepNumber}
                    className={`w-3 h-3 rounded-full ${
                      stepNumber === step
                        ? 'bg-blue-600'
                        : stepNumber < step
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
