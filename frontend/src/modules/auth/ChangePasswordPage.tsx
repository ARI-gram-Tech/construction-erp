// /src/modules/auth/ChangePasswordPage.tsx

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { changePassword } from "@/services/auth";

export function ChangePasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const forced = Boolean(
    (location.state as { forced?: boolean } | null)?.forced,
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* =========================================================
     PASSWORD STRENGTH
  ========================================================= */

  const passwordStrength = useMemo(() => {
    if (!newPassword) {
      return {
        score: 0,
        label: "",
        width: "0%",
      };
    }

    let score = 0;

    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 2) {
      return {
        score,
        label: "Weak",
        width: "35%",
      };
    }

    if (score <= 3) {
      return {
        score,
        label: "Fair",
        width: "60%",
      };
    }

    if (score === 4) {
      return {
        score,
        label: "Good",
        width: "80%",
      };
    }

    return {
      score,
      label: "Strong",
      width: "100%",
    };
  }, [newPassword]);

  /* =========================================================
     PASSWORD REQUIREMENTS
  ========================================================= */

  const requirements = [
    {
      label: "At least 8 characters",
      valid: newPassword.length >= 8,
    },
    {
      label: "Contains an uppercase letter",
      valid: /[A-Z]/.test(newPassword),
    },
    {
      label: "Contains a number",
      valid: /[0-9]/.test(newPassword),
    },
    {
      label: "Passwords match",
      valid: confirm.length > 0 && newPassword === confirm,
    },
  ];

  /* =========================================================
     BACK TO LOGIN
  ========================================================= */

  function handleBackToLogin() {
    // End the current session before going back to login.
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    navigate("/login", {
      replace: true,
    });
  }

  /* =========================================================
     SUBMIT
  ========================================================= */

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirm) {
      setError("New passwords don't match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      /*
       * Password has successfully changed.
       *
       * Remove the current authenticated session so that
       * the user MUST log in again using the new password.
       */
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      /*
       * Send the user back to the login page.
       *
       * passwordChanged is used by LoginPage to display
       * a success message.
       */
      navigate("/login", {
        replace: true,
        state: {
          passwordChanged: true,
        },
      });
    } catch (err: unknown) {
      const responseData = (
        err as {
          response?: {
            data?: {
              current_password?: string[];
              new_password?: string[];
              detail?: string;
            };
          };
        }
      )?.response?.data;

      setError(
        responseData?.current_password?.[0] ||
          responseData?.new_password?.[0] ||
          responseData?.detail ||
          "Couldn't update your password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-steel-50 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      {/* =====================================================
          BACKGROUND DECORATION
      ===================================================== */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl" />

        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-steel-900/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* ===================================================
            BRANDING
        =================================================== */}

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Building2 size={23} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-steel-900">
                ARIGram
              </h1>

              <p className="text-xs text-steel-500">
                Construction Management Platform
              </p>
            </div>
          </div>
        </div>

        {/* ===================================================
            MAIN CARD
        =================================================== */}

        <div className="rounded-2xl border border-steel-200 bg-white shadow-xl shadow-steel-900/5 overflow-hidden">
          {/* Orange top accent */}
          <div className="h-1 bg-linear-to-r from-orange-500 via-orange-600 to-orange-500" />

          <div className="p-7 sm:p-9">
            {/* =================================================
                HEADER
            ================================================= */}

            <div className="text-center">
              <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                {forced ? (
                  <KeyRound size={27} className="text-orange-600" />
                ) : (
                  <Lock size={27} className="text-orange-600" />
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-steel-900">
                {forced ? "Set a new password" : "Change password"}
              </h2>

              <p className="mt-2 text-sm sm:text-base leading-6 text-steel-500 max-w-md mx-auto">
                {forced
                  ? "You're using a temporary password. Set your own password before continuing."
                  : "Update your account password to keep your account secure."}
              </p>
            </div>

            {/* =================================================
                SECURITY NOTICE
            ================================================= */}

            {forced && (
              <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3.5 flex gap-3">
                <ShieldCheck
                  size={19}
                  className="text-orange-600 shrink-0 mt-0.5"
                />

                <div>
                  <p className="text-sm font-semibold text-orange-900">
                    Account security
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-orange-800">
                    This temporary password must be replaced before you can
                    access your workspace.
                  </p>
                </div>
              </div>
            )}

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <X size={13} className="text-red-600" />
                </div>

                <p className="text-sm text-red-700 leading-5">{error}</p>
              </div>
            )}

            {/* =================================================
                FORM
            ================================================= */}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              {/* =================================================
                  CURRENT / TEMPORARY PASSWORD
              ================================================= */}

              <PasswordField
                label={forced ? "Temporary password" : "Current password"}
                value={currentPassword}
                onChange={setCurrentPassword}
                visible={showCurrent}
                setVisible={setShowCurrent}
                icon={<KeyRound size={17} />}
                disabled={loading}
                placeholder="Enter your current password"
              />

              {/* =================================================
                  NEW PASSWORD
              ================================================= */}

              <div className="space-y-2">
                <label className="text-sm font-medium text-steel-700 flex items-center gap-2">
                  <Lock size={16} className="text-steel-400" />
                  New password
                </label>

                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-steel-300 bg-white px-4 py-3 pr-12 text-sm text-steel-900 placeholder-steel-400 outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Create a strong password"
                    minLength={8}
                    required
                    disabled={loading}
                  />

                  <PasswordToggle
                    visible={showNew}
                    setVisible={setShowNew}
                    disabled={loading}
                  />
                </div>

                {/* =================================================
                    PASSWORD STRENGTH
                ================================================= */}

                {newPassword && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-steel-500">
                        Password strength
                      </span>

                      <span className="text-xs font-semibold text-steel-700">
                        {passwordStrength.label}
                      </span>
                    </div>

                    <div className="h-1.5 rounded-full bg-steel-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-500 transition-all duration-300"
                        style={{
                          width: passwordStrength.width,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* =================================================
                    PASSWORD REQUIREMENTS
                ================================================= */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {requirements.map((requirement) => (
                    <div
                      key={requirement.label}
                      className="flex items-center gap-2"
                    >
                      <div
                        className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
                          requirement.valid ? "bg-green-100" : "bg-steel-100"
                        }`}
                      >
                        {requirement.valid ? (
                          <Check size={10} className="text-green-600" />
                        ) : (
                          <div className="h-1 w-1 rounded-full bg-steel-400" />
                        )}
                      </div>

                      <span
                        className={`text-xs ${
                          requirement.valid
                            ? "text-green-700"
                            : "text-steel-500"
                        }`}
                      >
                        {requirement.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* =================================================
                  CONFIRM PASSWORD
              ================================================= */}

              <PasswordField
                label="Confirm new password"
                value={confirm}
                onChange={setConfirm}
                visible={showConfirm}
                setVisible={setShowConfirm}
                icon={<CheckCircle2 size={17} />}
                disabled={loading}
                placeholder="Re-enter your new password"
              />

              {/* =================================================
                  PASSWORD MATCH MESSAGE
              ================================================= */}

              {confirm && (
                <div
                  className={`-mt-2 text-xs font-medium ${
                    newPassword === confirm ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {newPassword === confirm
                    ? "✓ Passwords match"
                    : "Passwords don't match"}
                </div>
              )}

              {/* =================================================
                  SUBMIT BUTTON
              ================================================= */}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Updating password...
                  </>
                ) : (
                  <>
                    {forced ? "Set new password" : "Update password"}

                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>

              {/* =================================================
                  BACK TO LOGIN
              ================================================= */}

              <button
                type="button"
                onClick={handleBackToLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-steel-200 bg-white py-3 px-4 text-sm font-medium text-steel-600 transition-all duration-200 hover:border-steel-300 hover:bg-steel-50 hover:text-steel-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={17} />
                Back to login
              </button>
            </form>

            {/* =================================================
                SECURITY FOOTER
            ================================================= */}

            <div className="mt-7 pt-6 border-t border-steel-100">
              <div className="flex items-center justify-center gap-2 text-steel-400">
                <ShieldCheck size={15} />

                <span className="text-xs">
                  Your password is securely encrypted
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <p className="text-center text-xs text-steel-400 mt-6">
          ARIGram • Secure • Enterprise Grade • Construction ERP
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   PASSWORD FIELD
========================================================= */

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  setVisible: (value: boolean) => void;
  icon: ReactNode;
  disabled: boolean;
  placeholder: string;
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  setVisible,
  icon,
  disabled,
  placeholder,
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-steel-700 flex items-center gap-2">
        <span className="text-steel-400">{icon}</span>

        {label}
      </label>

      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-steel-300 bg-white px-4 py-3 pr-12 text-sm text-steel-900 placeholder-steel-400 outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={placeholder}
          required
          disabled={disabled}
        />

        <PasswordToggle
          visible={visible}
          setVisible={setVisible}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

/* =========================================================
   PASSWORD TOGGLE
========================================================= */

interface PasswordToggleProps {
  visible: boolean;
  setVisible: (value: boolean) => void;
  disabled: boolean;
}

function PasswordToggle({
  visible,
  setVisible,
  disabled,
}: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={() => setVisible(!visible)}
      disabled={disabled}
      aria-label={visible ? "Hide password" : "Show password"}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-600 transition-colors disabled:opacity-50"
    >
      {visible ? <EyeOff size={19} /> : <Eye size={19} />}
    </button>
  );
}
