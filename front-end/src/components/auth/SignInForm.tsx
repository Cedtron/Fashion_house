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

      navigate("/app");
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <div className="mt-6 bg-white dark:bg-transparent rounded-xl p-6">
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-400">Sign in to manage your store</p>

          <form className="mt-6" onSubmit={submit}>
            <div className="space-y-4">
              {/* Email */}
              <div>
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                />
              </div>

              {/* Password with Eye Toggle */}
              <div className="relative">
                <Label>Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />

                {/* Eye Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox checked={isChecked} onChange={(v) => setIsChecked(v)} />
                <div className="text-sm">Remember me</div>
              </div>

              <div>
                <Link to="/forgot-password" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400">
                  Forgot password?
                </Link>
              </div>
            </div>

            <div className="mt-6">
              <Button className="w-full" size="sm" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-center text-sm">
              Don&apos;t have an account? <Link to="/signup" className="text-brand-500">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
