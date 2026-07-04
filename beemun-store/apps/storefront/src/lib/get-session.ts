import { headers } from "next/headers"
import { auth } from "./auth"

export const getBeemunSession = async () => {
  return auth.api.getSession({
    headers: await headers(),
  } as any)
}
