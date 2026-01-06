import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import api from "../../utils/axios";
import Cookies from "js-cookie";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const startTime = Date.now();
    const minLoadingTime = 4000; // 4 seconds minimum

    try {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data;

      const token = data?.access_token;
      const user = data?.user;

      if (token) {
        Cookies.set("token", token, { expires: 7, secure: true, sameSite: "strict" });
      }

      if (user) {
        Cookies.set("user", JSON.stringify(user), { expires: 7, secure: true, sameSite: "strict" });
      }

      // Ensure minimum 4 second loading time
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));

      navigate("/app");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : "Login failed");
      setError(message);
      
      // Ensure minimum loading time even on error
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center flex-1 py-10 px-4">
      {/* Full-screen loader overlay while logging in */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-coffee-300 border-t-coffee-700 rounded-full animate-spin" />
        </div>
      )}

      <div className="relative w-full max-w-md p-8 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl border border-white/40">

        {/* Title */}
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-coffee-500">
            WELCOME BACK
          </p>
          <h2 className="mt-2 text-3xl font-bold text-coffee-800">
            Fashion House
          </h2>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={submit}>
          {/* Email */}
          <div>
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="designer@fashionhouse.com"
              className="transition-all focus:ring-2 focus:ring-coffee-300"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Label>Password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="transition-all focus:ring-2 focus:ring-coffee-300"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute text-gray-500 right-3 top-9 hover:text-gray-700 transition"
            >
              {showPassword ?   <FaEye />:<FaEyeSlash />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* Remember + forgot */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <Checkbox checked={isChecked} onChange={(v) => setIsChecked(v)} />
              <span className="text-sm text-gray-600">Remember me</span>
            </div>

            <Link
              to="/forgot-password"
              className="text-sm font-medium text-coffee-600 hover:text-coffee-800 transition"
            >
              Forgot password?
            </Link>
          </div>

          {/* Button */}
          <div className="pt-2">
            <Button
              className="w-full bg-coffee-700 hover:bg-coffee-800 shadow-md transition-all"
              size="sm"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </div>
        </form>

        {/* Signup link */}
        <div className="mt-6 text-sm text-center text-gray-700">
          New to Fashion House?{" "}
          <Link
            to="/signup"
            className="font-semibold text-coffee-600 hover:text-coffee-800 transition"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
