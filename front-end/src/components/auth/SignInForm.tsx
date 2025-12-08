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
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : "Login failed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="grid items-center w-full gap-10 mx-auto lg:grid-cols-2 max-w-6xl py-10">
        

        <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8">
          <div>
            <div className="mb-5">
              <p className="text-xs font-semibold tracking-[0.3em] text-coffee-500">WELCOME BACK</p>
              <h2 className="mt-2 text-3xl font-semibold text-coffee-800">Fashion hoouse</h2>
           
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <div>
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="designer@fashionhouse.com"
                />
              </div>

              <div className="relative">
                <Label>Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <Checkbox checked={isChecked} onChange={(v) => setIsChecked(v)} />
                  <div className="text-sm text-gray-600">Remember me</div>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-coffee-600 hover:text-coffee-800"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full bg-coffee-600 hover:bg-coffee-700"
                  size="sm"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              New to Fashion House?{" "}
              <Link to="/signup" className="font-semibold text-coffee-600 hover:text-coffee-800">
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
