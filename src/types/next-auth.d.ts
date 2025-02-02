import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      email: string;
      name: string;
    } & DefaultSession["user"]
  }

  interface User {
    token?: string;
  }
}
