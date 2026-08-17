// /auth/AcceptInvite.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { acceptInvite } from "@/services/companies";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Invite link is missing a token.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await acceptInvite({
        token,
        first_name: firstName,
        last_name: lastName,
        password,
      });
      navigate("/login");
    } catch (err: any) {
      setError(
        err?.response?.data?.token?.[0] ||
          err?.response?.data?.detail ||
          "Something went wrong. This invite link may be invalid or expired.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-lg shadow">
      <h1 className="text-xl font-semibold mb-1">Set up your account</h1>
      <p className="text-slate-500 mb-6">
        Complete your details to activate your Company Admin account.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">First name</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Last name</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Setting up..." : "Activate account"}
        </button>
      </form>
    </div>
  );
}
