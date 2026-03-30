import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { safeRedirectUrl } from "@/lib/utils/url"
import { CustomSignUp } from "./custom-sign-up"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  const { userId } = await auth()
  const { redirect_url } = await searchParams
  const safeRedirect = safeRedirectUrl(redirect_url)

  if (userId) {
    redirect(safeRedirect)
  }

  return <CustomSignUp redirectUrl={safeRedirect} />
}
