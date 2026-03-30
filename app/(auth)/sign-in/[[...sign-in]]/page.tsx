import { CustomSignIn } from "./custom-sign-in"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  const { redirect_url } = await searchParams
  return <CustomSignIn redirectUrl={redirect_url} />
}
