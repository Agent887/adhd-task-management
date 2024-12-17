import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuthResponse } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/cloud-platform'
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        const response = await fetch(`${API_URL}/auth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user, account }),
        });

        if (!response.ok) {
          return null;
        }

        const data: AuthResponse = await response.json();
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          token: data.token,
        };
      } catch (error) {
        return null;
      }
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          user
        };
      }
      return token;
    },
    async session({ session, token }) {
      session.user = token.user as any;
      session.accessToken = token.accessToken;
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  }
});

export { handler as GET, handler as POST };
