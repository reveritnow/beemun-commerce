"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"
import { authClient } from "../../../../lib/auth-client"

type Mode = "sign-in" | "sign-up" | "reset"

export default function MakerPortalAuthForm({
  countryCode,
}: {
  countryCode: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>("sign-up")
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  )
  const [message, setMessage] = useState("")
  const callbackURL =
    searchParams.get("callbackUrl") || `/${countryCode}/maker-portal/start`

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setState("submitting")
    setMessage("")

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") || "")
    const password = String(formData.get("password") || "")
    const name = String(formData.get("name") || "")

    try {
      if (mode === "reset") {
        await authClient.forgetPassword({
          email,
          redirectTo: `/${countryCode}/maker-portal/sign-in`,
        } as any)
        setState("success")
        setMessage("Password reset instructions have been sent if the account exists.")
        return
      }

      if (mode === "sign-up") {
        await authClient.signUp.email({
          email,
          password,
          name,
          callbackURL,
        } as any)
        setState("success")
        setMessage(
          "Check your email to verify your BEEMUN account. After verification, BEEMUN will continue you to the right maker application step."
        )
        return
      }

      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL,
      } as any)

      if ((result as any)?.error) {
        throw new Error((result as any).error.message || "Sign in failed.")
      }

      router.push(callbackURL)
      router.refresh()
    } catch (error) {
      setState("error")
      setMessage(
        error instanceof Error
          ? error.message
          : "Authentication failed. Please try again."
      )
    }
  }

  return (
    <section className="beemun-section beemun-application-section">
      <div className="beemun-section-head">
        <p className="beemun-eyebrow">Maker portal</p>
        <h2>
          {mode === "sign-in"
            ? "Sign in to continue your maker application."
            : mode === "reset"
            ? "Reset your BEEMUN password."
            : "Create one BEEMUN account for your full journey."}
        </h2>
        <p>
          This same account is used for customer access, maker applications, and
          the maker dashboard after BEEMUN approval.
        </p>
      </div>

      <form className="beemun-application-form" onSubmit={submit}>
        {mode === "sign-up" && (
          <label>
            <span>Name *</span>
            <input name="name" required />
          </label>
        )}
        <label>
          <span>Email *</span>
          <input name="email" type="email" required />
        </label>
        {mode !== "reset" && (
          <label>
            <span>Password *</span>
            <input name="password" type="password" minLength={8} required />
          </label>
        )}

        {message && (
          <p
            className={
              state === "error"
                ? "beemun-application-error"
                : "beemun-application-success"
            }
            role="status"
          >
            {message}
          </p>
        )}

        <button
          className="beemun-btn-primary"
          type="submit"
          disabled={state === "submitting"}
        >
          {state === "submitting"
            ? "Please wait..."
            : mode === "sign-in"
            ? "Sign in"
            : mode === "reset"
            ? "Send reset link"
            : "Create account"}
        </button>

        <div className="beemun-radio-row">
          <button type="button" onClick={() => setMode("sign-up")}>
            Sign up
          </button>
          <button type="button" onClick={() => setMode("sign-in")}>
            Sign in
          </button>
          <button type="button" onClick={() => setMode("reset")}>
            Reset password
          </button>
        </div>
      </form>
    </section>
  )
}
