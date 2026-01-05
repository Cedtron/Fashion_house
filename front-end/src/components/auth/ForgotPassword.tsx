import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { FiChevronLeft, FiEye, FiEyeOff, FiMail, FiLock, FiKey } from "react-icons/fi";
import api from "../../utils/axios";

interface ForgotPasswordFormData {
  email: string;
  passwordHint: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ForgotPasswordForm() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    getValues,
    reset
  } = useForm<ForgotPasswordFormData>();

  const watchedPassword = watch("newPassword");

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);

    try {
      if (step === 1) {
        // Step 1: Request reset code with email and password hint validation
        await api.post('/users/forgot-password', {
          email: data.email,
          passwordHint: data.passwordHint
        });

        toast.success("Email and password hint verified! Reset code sent to your email!");
        setStep(2);

      } else if (step === 2) {
        // Step 2: Verify reset code
        const response = await api.post('/users/verify-reset-code', {
          email: data.email,
          code: data.code
        });

        if (response.data.valid) {
          toast.success("Code verified successfully!");
          setStep(3);
        }

      } else if (step === 3) {
        // Step 3: Reset password
        if (data.newPassword !== data.confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }

        await api.post('/users/reset-password', {
          email: data.email,
          code: data.code,
          newPassword: data.newPassword
        });

        toast.success("Password reset successfully!");
        
        // Reset form and redirect to login
        reset();
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
    const values = getValues();
    setLoading(true);
    try {
      await api.post('/users/forgot-password', {
        email: values.email,
        passwordHint: values.passwordHint
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
          <FiChevronLeft className="w-5 h-5 mr-1" />
          Back to Sign In
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8 text-center">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Forgot Password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === 1 && "Enter your email and password hint to reset your password."}
            {step === 2 && "Check your email and enter the verification code below."}
            {step === 3 && "Set your new password below."}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* STEP 1 — EMAIL & PASSWORD HINT */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiMail className="inline w-4 h-4 mr-2" />
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address"
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter your registered email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiKey className="inline w-4 h-4 mr-2" />
                  Password Hint Answer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("passwordHint", {
                    required: "Password hint answer is required",
                    minLength: {
                      value: 2,
                      message: "Password hint answer must be at least 2 characters"
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter your password hint answer"
                />
                {errors.passwordHint && (
                  <p className="mt-1 text-sm text-red-600">{errors.passwordHint.message}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Enter the answer to your password hint question for verification.
                </p>
              </div>
            </>
          )}

          {/* STEP 2 — VERIFICATION CODE */}
          {step === 2 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiKey className="inline w-4 h-4 mr-2" />
                Verification Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("code", {
                  required: "Verification code is required",
                  pattern: {
                    value: /^\d{6}$/,
                    message: "Code must be 6 digits"
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center text-lg tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Code sent to {getValues("email")}
                </p>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiLock className="inline w-4 h-4 mr-2" />
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("newPassword", {
                      required: "New password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters"
                      }
                    })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPassword ? (
                      <FiEyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <FiEye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiLock className="inline w-4 h-4 mr-2" />
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === watchedPassword || "Passwords do not match"
                    })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <FiEye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </>
          )}

          {/* NAVIGATION BUTTONS */}
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  {step === 1 && "Verify & Send Code"}
                  {step === 2 && "Verify Code"}
                  {step === 3 && "Reset Password"}
                </>
              )}
            </button>
          </div>
        </form>

        {/* STEP INDICATOR */}
        <div className="flex justify-center mt-8">
          <div className="flex space-x-2">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-2 h-2 rounded-full ${
                  stepNumber === step
                    ? "bg-blue-600"
                    : stepNumber < step
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}