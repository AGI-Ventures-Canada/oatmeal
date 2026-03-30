import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"

const mockPush = mock(() => {})
const mockSetActive = mock(() => Promise.resolve())

let signInCreateImpl: () => Promise<unknown> = () =>
  Promise.resolve({ status: "complete", createdSessionId: "session_123" })
let signInAttemptSecondFactorImpl: () => Promise<unknown> = () =>
  Promise.resolve({ status: "complete", createdSessionId: "session_123" })
let signInAttemptFirstFactorImpl: () => Promise<unknown> = () =>
  Promise.resolve({ status: "needs_new_password" })
let signInResetPasswordImpl: () => Promise<unknown> = () =>
  Promise.resolve({ status: "complete", createdSessionId: "session_123" })
let signInAuthenticateWithRedirectImpl: () => Promise<unknown> = () =>
  Promise.resolve()

const signInCreate = mock((...args: unknown[]) => signInCreateImpl(...args))
const signInAttemptSecondFactor = mock((...args: unknown[]) =>
  signInAttemptSecondFactorImpl(...args),
)
const signInAttemptFirstFactor = mock((...args: unknown[]) =>
  signInAttemptFirstFactorImpl(...args),
)
const signInResetPassword = mock((...args: unknown[]) =>
  signInResetPasswordImpl(...args),
)
const signInAuthenticateWithRedirect = mock((...args: unknown[]) =>
  signInAuthenticateWithRedirectImpl(...args),
)

let isSignInLoaded = true

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

mock.module("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

mock.module("@clerk/nextjs", () => ({
  useSignIn: () => ({
    isLoaded: isSignInLoaded,
    signIn: isSignInLoaded
      ? {
          create: signInCreate,
          attemptSecondFactor: signInAttemptSecondFactor,
          attemptFirstFactor: signInAttemptFirstFactor,
          resetPassword: signInResetPassword,
          authenticateWithRedirect: signInAuthenticateWithRedirect,
        }
      : undefined,
    setActive: mockSetActive,
  }),
  useSignUp: () => ({ isLoaded: false, signUp: undefined, setActive: mock(() => Promise.resolve()) }),
  useOrganizationList: () => ({ createOrganization: undefined, setActive: undefined }),
}))

mock.module("@clerk/nextjs/errors", () => ({
  isClerkAPIResponseError: (err: unknown) =>
    err !== null &&
    typeof err === "object" &&
    "errors" in (err as object) &&
    Array.isArray((err as { errors: unknown }).errors),
}))

const { SignInForm } = await import("@/components/auth/sign-in-form")

beforeEach(() => {
  isSignInLoaded = true
  signInCreateImpl = () =>
    Promise.resolve({ status: "complete", createdSessionId: "session_123" })
  signInAttemptSecondFactorImpl = () =>
    Promise.resolve({ status: "complete", createdSessionId: "session_123" })
  signInAttemptFirstFactorImpl = () =>
    Promise.resolve({ status: "needs_new_password" })
  signInResetPasswordImpl = () =>
    Promise.resolve({ status: "complete", createdSessionId: "session_123" })
  signInAuthenticateWithRedirectImpl = () => Promise.resolve()
  signInCreate.mockClear()
  signInAttemptSecondFactor.mockClear()
  signInAttemptFirstFactor.mockClear()
  signInResetPassword.mockClear()
  signInAuthenticateWithRedirect.mockClear()
  mockPush.mockClear()
  mockSetActive.mockClear()
})

afterEach(() => {
  cleanup()
})

describe("SignInForm", () => {
  describe("credentials step", () => {
    it("renders email, password fields and OAuth buttons", () => {
      render(<SignInForm />)
      expect(screen.getByLabelText("Email")).toBeDefined()
      expect(screen.getByLabelText("Password")).toBeDefined()
      expect(screen.getByText("Google")).toBeDefined()
      expect(screen.getByText("GitHub")).toBeDefined()
      expect(screen.getByText("LinkedIn")).toBeDefined()
    })

    it("renders sign in button and sign up link", () => {
      render(<SignInForm />)
      expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined()
      expect(screen.getByText("Sign up")).toBeDefined()
    })

    it("shows loading spinner while Clerk is not loaded", () => {
      isSignInLoaded = false
      render(<SignInForm />)
      expect(screen.queryByLabelText("Email")).toBeNull()
    })

    it("calls signIn.create with identifier and password on submit", async () => {
      render(<SignInForm />)
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "user@example.com" },
      })
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "secret" },
      })
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
      await waitFor(() => {
        expect(signInCreate).toHaveBeenCalledWith({
          identifier: "user@example.com",
          password: "secret",
        })
      })
    })

    it("calls setActive and router.push on complete", async () => {
      render(<SignInForm redirectUrl="/dashboard" />)
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
      await waitFor(() => {
        expect(mockSetActive).toHaveBeenCalledWith({ session: "session_123" })
        expect(mockPush).toHaveBeenCalledWith("/dashboard")
      })
    })

    it("defaults redirect to /home when no redirectUrl given", async () => {
      render(<SignInForm />)
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/home")
      })
    })

    it("shows error message on Clerk API error", async () => {
      signInCreateImpl = () =>
        Promise.reject({ errors: [{ message: "Invalid credentials" }] })
      render(<SignInForm />)
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
      await waitFor(() => {
        expect(screen.getByText("Invalid credentials")).toBeDefined()
      })
    })

    it("transitions to 2FA step when needs_second_factor", async () => {
      signInCreateImpl = () =>
        Promise.resolve({ status: "needs_second_factor" })
      render(<SignInForm />)
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
      await waitFor(() => {
        expect(screen.getByText("Two-factor authentication")).toBeDefined()
      })
    })

    it("transitions to reset-request step when Forgot password is clicked", () => {
      render(<SignInForm />)
      fireEvent.click(screen.getByText("Forgot password?"))
      expect(screen.getByText("Reset password")).toBeDefined()
      expect(screen.getByRole("button", { name: "Send reset code" })).toBeDefined()
    })
  })

  describe("second factor step", () => {
    async function goToSecondFactor() {
      signInCreateImpl = () =>
        Promise.resolve({ status: "needs_second_factor" })
      render(<SignInForm />)
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
      await waitFor(() =>
        expect(screen.getByText("Two-factor authentication")).toBeDefined(),
      )
    }

    it("calls attemptSecondFactor with totp code", async () => {
      await goToSecondFactor()
      fireEvent.change(screen.getByLabelText("Verification code"), {
        target: { value: "123456" },
      })
      fireEvent.click(screen.getByRole("button", { name: "Verify" }))
      await waitFor(() => {
        expect(signInAttemptSecondFactor).toHaveBeenCalledWith({
          strategy: "totp",
          code: "123456",
        })
      })
    })

    it("redirects on successful verification", async () => {
      await goToSecondFactor()
      fireEvent.click(screen.getByRole("button", { name: "Verify" }))
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/home")
      })
    })

    it("shows error on failed verification", async () => {
      await goToSecondFactor()
      signInAttemptSecondFactorImpl = () =>
        Promise.reject({ errors: [{ message: "Invalid code" }] })
      fireEvent.click(screen.getByRole("button", { name: "Verify" }))
      await waitFor(() => {
        expect(screen.getByText("Invalid code")).toBeDefined()
      })
    })

    it("navigates back to credentials on Back button", async () => {
      await goToSecondFactor()
      fireEvent.click(screen.getByText("Back to sign in"))
      expect(screen.getByLabelText("Email")).toBeDefined()
    })
  })

  describe("password reset flow", () => {
    function goToResetRequest() {
      render(<SignInForm />)
      fireEvent.click(screen.getByText("Forgot password?"))
    }

    it("sends reset email and transitions to reset-code step", async () => {
      signInCreateImpl = () => Promise.resolve({})
      goToResetRequest()
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "user@example.com" },
      })
      fireEvent.click(screen.getByRole("button", { name: "Send reset code" }))
      await waitFor(() => {
        expect(screen.getByText("Check your email")).toBeDefined()
      })
    })

    it("shows error if reset request fails", async () => {
      signInCreateImpl = () =>
        Promise.reject({ errors: [{ message: "Email not found" }] })
      goToResetRequest()
      fireEvent.click(screen.getByRole("button", { name: "Send reset code" }))
      await waitFor(() => {
        expect(screen.getByText("Email not found")).toBeDefined()
      })
    })

    it("transitions to reset-password step after valid code", async () => {
      signInCreateImpl = () => Promise.resolve({})
      goToResetRequest()
      fireEvent.click(screen.getByRole("button", { name: "Send reset code" }))
      await waitFor(() =>
        expect(screen.getByText("Check your email")).toBeDefined(),
      )
      fireEvent.click(screen.getByRole("button", { name: "Verify code" }))
      await waitFor(() => {
        expect(screen.getByText("Set new password")).toBeDefined()
      })
    })

    it("resets password and redirects on success", async () => {
      signInCreateImpl = () => Promise.resolve({})
      goToResetRequest()
      fireEvent.click(screen.getByRole("button", { name: "Send reset code" }))
      await waitFor(() =>
        expect(screen.getByText("Check your email")).toBeDefined(),
      )
      fireEvent.click(screen.getByRole("button", { name: "Verify code" }))
      await waitFor(() =>
        expect(screen.getByText("Set new password")).toBeDefined(),
      )
      fireEvent.change(screen.getByLabelText("New password"), {
        target: { value: "newpass123" },
      })
      fireEvent.click(screen.getByRole("button", { name: "Reset password" }))
      await waitFor(() => {
        expect(signInResetPassword).toHaveBeenCalledWith({
          password: "newpass123",
        })
        expect(mockPush).toHaveBeenCalledWith("/home")
      })
    })
  })

  describe("OAuth", () => {
    it("calls authenticateWithRedirect for Google", async () => {
      render(<SignInForm redirectUrl="/dashboard" />)
      fireEvent.click(screen.getByText("Google"))
      await waitFor(() => {
        expect(signInAuthenticateWithRedirect).toHaveBeenCalledWith({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/dashboard",
        })
      })
    })

    it("calls authenticateWithRedirect for GitHub", async () => {
      render(<SignInForm />)
      fireEvent.click(screen.getByText("GitHub"))
      await waitFor(() => {
        expect(signInAuthenticateWithRedirect).toHaveBeenCalledWith({
          strategy: "oauth_github",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/home",
        })
      })
    })

    it("calls authenticateWithRedirect for LinkedIn", async () => {
      render(<SignInForm />)
      fireEvent.click(screen.getByText("LinkedIn"))
      await waitFor(() => {
        expect(signInAuthenticateWithRedirect).toHaveBeenCalledWith({
          strategy: "oauth_linkedin_oidc",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/home",
        })
      })
    })
  })

  describe("sign-up link", () => {
    it("includes redirect_url in sign-up href when redirectUrl is set", () => {
      render(<SignInForm redirectUrl="/event/abc" />)
      const link = screen.getByText("Sign up").closest("a")!
      expect(link.getAttribute("href")).toContain("redirect_url")
    })

    it("omits redirect_url in sign-up href when redirectUrl is /home", () => {
      render(<SignInForm redirectUrl="/home" />)
      const link = screen.getByText("Sign up").closest("a")!
      expect(link.getAttribute("href")).toBe("/sign-up")
    })
  })
})
