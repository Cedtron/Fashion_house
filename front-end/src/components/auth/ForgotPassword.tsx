import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { FiChevronLeft, FiEye, FiEyeOff, FiMail, FiLock, FiKey, FiCheck } from "react-icons/fi";
import api from "../../utils/axios";

interface StepFormData {
  email: string;
  passwordhint: string;
  newPassword: string;
  confirmPassword: string;
}

type Step = 1 | 2 | 3;

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Cached data from previous steps
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<StepFormData>();

  const watchedPassword = watch("newPassword");

  // Step 1: Verify email and password hint - request reset code
  const requestResetCode = async (data: StepFormData) => {
    setLoading(true);
    try {
      console.log('📧 Step 1: Requesting reset code for:', data.email);
      
      const response = await api.post('/users/forgot-password', {
        email: data.email,
        passwordHint: data.passwordHint || "dummy_hint_for_email_code" // Use dummy hint if not provided
      });

      console.log('✅ Reset code response:', response.data);

      // Store the email and code for next steps
      setVerifiedEmail(data.email);
      
      // If backend returns code for testing, store it
      if (response.data.code) {
        setResetCode(response.data.code);
        console.log('📱 Reset code (for testing):', response.data.code);
      }
      
      // Show success message
      toast.success(response.data.message || "Reset code sent to your email!");
      
      // Move to verification step
      setStep("verification");
    } catch (error: any) {
      console.error('❌ Request reset code error:', error);
      toast.error(error.response?.data?.message || "Failed to request reset code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify reset code
  const verifyResetCode = async (data: StepFormData) => {
    setLoading(true);
    try {
      console.log('🔐 Step 2: Verifying reset code:', data.code);
      
      const response = await api.post('/users/verify-reset-code', {
        email: verifiedEmail,
        code: data.code
      });

      console.log('✅ Code verification response:', response.data);

      if (response.data.valid) {
        toast.success("Code verified successfully!");
        setStep("newPassword");
      }
    } catch (error: any) {
      console.error('❌ Code verification error:', error);
      toast.error(error.response?.data?.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const resetPassword = async (data: StepFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Step 3: Resetting password for:', verifiedEmail);
      
      const response = await api.post('/users/reset-password', {
        email: verifiedEmail,
        code: resetCode, // Use the code from state or form
        newPassword: data.newPassword
      });

      console.log('✅ Password reset response:', response.data);

      toast.success("🎉 Password reset successfully! Redirecting to signin...");
      
      // Reset everything
      reset();
      setVerifiedEmail("");
      setResetCode("");
      
      // Redirect to signin page after 2 seconds
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      toast.error(error.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // Alternative: Direct password reset without code verification (if you want simpler flow)
  const directResetPassword = async (data: StepFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      console.log('🎯 Direct password reset for:', verifiedEmail);
      
      // Create a new endpoint in your backend for this
      const response = await api.post('/users/reset-password-direct', {
        email: verifiedEmail,
        newPassword: data.newPassword
      });

      console.log('✅ Direct password reset response:', response.data);

      toast.success("🎉 Password reset successfully! Redirecting...");
      
      // Reset everything
      reset();
      setVerifiedEmail("");
      setResetCode("");
      
      // Redirect to signin page after 2 seconds
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    } catch (error: any) {
      console.error('❌ Direct password reset error:', error);
      toast.error(error.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // Submit handler for each step
  const onSubmit = async (data: StepFormData) => {
    if (step === "email") {
      await requestResetCode(data);
    } else if (step === "verification") {
      await verifyResetCode(data);
    } else if (step === "newPassword") {
      await resetPassword(data);
    }
  };

  // Handle back button
  const handleBack = () => {
    if (step === "verification") {
      setStep("email");
      setVerifiedEmail("");
      setResetCode("");
    } else if (step === "newPassword") {
      setStep("verification");
    }
  };

  // For testing: Auto-fill code if available
  const handleTestCodeFill = () => {
    if (resetCode) {
      const form = document.querySelector('input[name="code"]') as HTMLInputElement;
      if (form) {
        form.value = resetCode;
      }
      toast.info("Test code auto-filled");
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
        <div className="mb-5 text-center sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm sm:text-title-md">
            Forgot Password
          </h1>
          <p className="text-sm text-gray-500">
            {step === "email" && "Enter your email to get started"}
            {step === "verification" && "Enter the verification code from your email"}
            {step === "newPassword" && "Set your new password"}
          </p>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center mt-4">
            <div className={`h-2 w-16 rounded-full ${step === "email" ? "bg-blue-600" : "bg-green-600"}`}></div>
            <div className={`h-2 w-16 mx-2 rounded-full ${step === "verification" || step === "newPassword" ? "bg-green-600" : "bg-gray-300"}`}></div>
            <div className={`h-2 w-16 rounded-full ${step === "newPassword" ? "bg-green-600" : "bg-gray-300"}`}></div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* STEP 1 — EMAIL */}
          {step === "email" && (
            <div className="space-y-4">
              <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
                <h3 className="text-sm font-medium text-blue-800">Step 1: Enter Your Email</h3>
                <p className="mt-1 text-sm text-blue-700">We'll send a verification code to your email</p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
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

          {/* STEP 2 — VERIFICATION CODE */}
          {step === "verification" && (
            <div className="space-y-4">
              <div className="flex items-center p-3 border border-green-200 rounded-lg bg-green-50">
                <FiCheck className="w-5 h-5 mr-3 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Email Sent</p>
                  <p className="text-xs text-green-700">Verification code sent to: {verifiedEmail}</p>
                </div>
              </div>

              {resetCode && (
                <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-yellow-800">For Testing:</span>
                    <button
                      type="button"
                      onClick={handleTestCodeFill}
                      className="ml-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Auto-fill test code
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-yellow-700">
                    Code: <span className="font-mono">{resetCode}</span>
                  </p>
                </div>
              )}

              <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
                <h3 className="text-sm font-medium text-blue-800">Step 2: Enter Verification Code</h3>
                <p className="mt-1 text-sm text-blue-700">Check your email for the 6-digit code</p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  <FiKey className="inline w-4 h-4 mr-2" />
                  Verification Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("code", {
                    required: "Verification code is required",
                    pattern: {
                      value: /^\d{10}$/,
                      message: "Code must be 10 digits"
                    }
                  })}
                  className="w-full px-3 py-2 font-mono text-lg border rounded-md shadow-sm order-gray-300 text-ceknter focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="000000"
                  maxLength={10}
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
                )}
              </div>

              <div className="text-sm text-gray-600">
                <p className="mb-1">Didn't receive the code?</p>
                <button
                  type="button"
                  onClick={() => {
                    // Resend code logic
                    toast.info("Resending code...");
                    // You can call requestResetCode again here
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Click here to resend
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — NEW PASSWORD */}
          {step === "newPassword" && (
            <div className="space-y-4">
              <div className="flex items-center p-3 border border-green-200 rounded-lg bg-green-50">
                <FiCheck className="w-5 h-5 mr-3 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Identity Verified</p>
                  <p className="text-xs text-green-700">Email: {verifiedEmail}</p>
                  <p className="text-xs text-green-700">Verification code verified ✓</p>
                </div>
              </div>

              <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
                <h3 className="text-sm font-medium text-blue-800">Step 3: Set New Password</h3>
                <p className="mt-1 text-sm text-blue-700">Create a strong new password</p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
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
                <label className="block mb-2 text-sm font-medium text-gray-700">
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
                  <div className="w-4 h-4 mr-2 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                  Processing...
                </div>
              ) : (
                <>
                  {step === "email" && "Send Code"}
                  {step === "verification" && "Verify Code"}
                  {step === "newPassword" && "Reset Password"}
                </>
              )}
            </button>
          </div>

          {/* Alternative direct reset (if you want simpler flow) */}
          {step === "email" && (
            <div className="pt-4 mt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={async () => {
                  const data = watch();
                  if (!data.email) {
                    toast.error("Please enter your email first");
                    return;
                  }
                  setVerifiedEmail(data.email);
                  setStep("newPassword");
                  toast.info("Proceeding to direct password reset...");
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Skip verification? (Direct reset)
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}