import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { safeRedirectUrl } from "@/lib/utils/url"
import { CustomSignIn } from "./custom-sign-in"

export default async function SignInPage({
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

  return <CustomSignIn redirectUrl={safeRedirect} />
}
