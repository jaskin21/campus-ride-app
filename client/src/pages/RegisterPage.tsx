import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import { useAuth } from "../hooks/useAuth";
import { registerThunk, verifyThunk } from "../features/auth/authThunks";
import { authService } from "../features/auth/authService";
import { zodResolver } from "@hookform/resolvers/zod";

const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .pipe(z.email("Invalid email address")),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [verifyCode, setVerifyCode] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { error, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setRegisteredEmail(data.email);
    const result = await dispatch(
      registerThunk({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      })
    );

    if (registerThunk.fulfilled.match(result)) {
      setStep("verify");
    } else {
      const message = (result.payload as string) ?? "";
      console.log("Rejected with:", message);
      if (
        message.includes("already") ||
        message.includes("exists") ||
        message.includes("Username")
      ) {
        setStep("verify");
      }
    }
  };

  const onVerify = async () => {
    try {
      await dispatch(
        verifyThunk({ email: registeredEmail, code: verifyCode })
      ).unwrap();
      navigate("/login");
    } catch {
      // error shown via Redux state
    }
  };

  if (step === "verify") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-400 mb-4">
            <span className="text-2xl">🚐</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            CampusRide
          </h1>
          <p className="text-zinc-500 text-sm mt-1">University of Mindanao</p>
        </div>

        <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-400/10 mb-3">
              <span className="text-xl">📧</span>
            </div>
            <h2 className="text-lg font-semibold text-white">
              Check your email
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              We sent a verification code to{" "}
              <span className="text-yellow-400">{registeredEmail}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="text-sm text-zinc-400 mb-1 block"
              >
                Verification code
              </label>
              <input
                id="code"
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full bg-zinc-800 text-white text-sm rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600 tracking-widest text-center"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center bg-red-400/10 rounded-xl py-2 px-3">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={onVerify}
              disabled={isLoading || verifyCode.length < 6}
              className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm rounded-xl py-3 transition-colors"
            >
              {isLoading ? "Verifying..." : "Verify email"}
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await authService.resendCode(registeredEmail);
                  alert("New code sent — check your email");
                } catch (err) {
                  console.error(err);
                }
              }}
              className="w-full text-yellow-400 hover:text-yellow-300 text-sm transition-colors py-2"
            >
              Resend code
            </button>

            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full text-zinc-500 hover:text-zinc-300 text-sm transition-colors py-2"
            >
              ← Back to registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-400 mb-4">
          <span className="text-2xl">🚐</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          CampusRide
        </h1>
        <p className="text-zinc-500 text-sm mt-1">University of Mindanao</p>
      </div>

      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">Create account</h2>
          <p className="text-zinc-500 text-xs mt-1">
            Students only — use your @umindanao.edu.ph email
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="firstName"
                className="text-sm text-zinc-400 mb-1 block"
              >
                First name
              </label>
              <input
                id="firstName"
                {...register("firstName")}
                type="text"
                placeholder="Juan"
                className="w-full bg-zinc-800 text-white text-sm rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
              />
              {errors.firstName && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="text-sm text-zinc-400 mb-1 block"
              >
                Last name
              </label>
              <input
                id="lastName"
                {...register("lastName")}
                type="text"
                placeholder="Dela Cruz"
                className="w-full bg-zinc-800 text-white text-sm rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
              />
              {errors.lastName && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="text-sm text-zinc-400 mb-1 block"
            >
              Email
            </label>
            <input
              id="email"
              {...register("email")}
              type="email"
              placeholder="you@umindanao.edu.ph"
              className="w-full bg-zinc-800 text-white text-sm rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-sm text-zinc-400 mb-1 block"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-zinc-800 text-white text-sm rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="text-sm text-zinc-400 mb-1 block"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              {...register("confirmPassword")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full bg-zinc-800 text-white text-sm rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center bg-red-400/10 rounded-xl py-2 px-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm rounded-xl py-3 transition-colors mt-2"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-zinc-700 text-xs mt-6 text-center max-w-xs">
        Account access requires admin approval after registration
      </p>
    </div>
  );
}