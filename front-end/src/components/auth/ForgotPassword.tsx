import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { FiChevronLeft, FiEye, FiEyeOff, FiMail, FiLock, FiKey, FiCheck } from "react-icons/fi";
import api from "../../utils/axios";

interface StepFormData {
  email: string;
  passwordHint: string;
  newPassword: string;
  confirmPassword: string;
}

type Step = "email" | "passwordHint" | "newPassword";

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Cached data from previous steps
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verifiedPasswordHint, setVerifiedPasswordHint] = useState("");
  
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<StepFormData>();

  const watchedPassword = watch("newPassword");

  // Step 1: Verify email exists
  const verifyEmail = async (data: StepFormData) => {
    setLoading(true);
    try {
      console.log('📧 Step 1: Verifying email:', data.email);
      
      const response = await api.post('/users/verify-email', {
        email: data.email
      });

      console.log('✅ Email verification response:', response.data);

      if (response.data.success) {
        setVerifiedEmail(data.email);
        setStep("passwordHint");
        toast.success("Email verified! Now enter your password hint.");
      }
    } catch (error: any) {
      console.error('❌ Email verification error:', error);
      toast.error(error.response?.data?.message || "Email not found.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify password hint
  const verifyPasswordHint = async (data: StepFormData) => {
    setLoading(true);
    try {
      console.log('🔑 Step 2: Verifying password hint for:', verifiedEmail);
      
      const response = await api.post('/users/verify-password-hint', {
        email: verifiedEmail,
        passwordHint: data.passwordHint
      });

      console.log('✅ Password hint verification response:', response.data);

      if (response.data.success) {
        setVerifiedPasswordHint(data.passwordHint);
        setStep("newPassword");
        toast.success("Password hint verified! Now set your new password.");
      }
    } catch (error: any) {
      console.error('❌ Password hint verification error:', error);
      toast.error(error.response?.data?.message || "Invalid password hint.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Change password
  const changePassword = async (data: StepFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Step 3: Changing password for:', verifiedEmail);
      
      const response = await api.post('/users/change-password-final', {
        email: verifiedEmail,
        passwordHint: verifiedPasswordHint,
        newPassword: data.newPassword
      });

      console.log('✅ Password change response:', response.data);

      if (response.data.success) {
        toast.success("🎉 Password Changed Successfully! Redirecting...");
        
        // Reset everything
        reset();
        setVerifiedEmail("");
        setVerifiedPasswordHint("");
        
        // Redirect to signin page after 2 seconds
        setTimeout(() => {
          navigate('/signin');
        }, 2000);
      }
    } catch (error: any) {
      console.error('❌ Password change error:', error);
      toast.error(error.response?.data?.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  // Submit handler for each step
  const onSubmit = async (data: StepFormData) => {
    if (step === "email") {
      await verifyEmail(data);
    } else if (step === "passwordHint") {
      await verifyPasswordHint(data);
    } else if (step === "newPassword") {
      await changePassword(data);
    }
  };

  // Handle back button
  const handleBack = () => {
    if (step === "passwordHint") {
      setStep("email");
      setVerifiedEmail("");
    } else if (step === "newPassword") {
      setStep("passwordHint");
      setVerifiedPasswordHint("");
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <FiChevronLeft className="w-5 h-5 mr-1" />
          Back to Sign In
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8 text-center">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm sm:text-title-md">
            Forgot Password - Step by Step
          </h1>
          <p className="text-sm text-gray-500">
            Current step: {step}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* STEP 1 — EMAIL */}
          {step === "email" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-sm font-medium text-blue-800">Step 1: Verify Email</h3>
                <p className="mt-1 text-sm text-blue-700">Enter your registered email address</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMail className="inline w-4 h-4 mr-2" />
                  Email Address <span className="text-red-500">*</span>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your registered email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 — PASSWORD HINT */}
          {step === "passwordHint" && (
            <div className="space-y-4">
              <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <FiCheck className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-800">Email Verified</p>
                  <p className="text-xs text-green-700">{verifiedEmail}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-sm font-medium text-blue-800">Step 2: Verify Password Hint</h3>
                <p className="mt-1 text-sm text-blue-700">Answer your security question</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password hint answer"
                />
                {errors.passwordHint && (
                  <p className="mt-1 text-sm text-red-600">{errors.passwordHint.message}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — NEW PASSWORD */}
          {step === "newPassword" && (
            <div className="space-y-4">
              <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <FiCheck className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-800">Identity Verified</p>
                  <p className="text-xs text-green-700">Email: {verifiedEmail}</p>
                  <p className="text-xs text-green-700">Password hint verified ✓</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-sm font-medium text-blue-800">Step 3: Set New Password</h3>
                <p className="mt-1 text-sm text-blue-700">Enter and confirm your new password</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            </div>
          )}

          {/* NAVIGATION BUTTONS */}
          <div className="flex gap-3 pt-2">
            {step !== "email" && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 ${
                step === "newPassword" 
                  ? "bg-green-600 hover:bg-green-700 focus:ring-green-500" 
                  : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
              } disabled:opacity-50`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  {step === "email" && "Verify Email"}
                  {step === "passwordHint" && "Verify Hint"}
                  {step === "newPassword" && "Change Password"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}