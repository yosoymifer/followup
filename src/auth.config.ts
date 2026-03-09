import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.organizationId = (user as any).organizationId;
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.organizationId) {
                (session.user as any).organizationId = token.organizationId;
                (session.user as any).role = token.role;
            }
            return session;
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isAuthPage = nextUrl.pathname.startsWith("/login");
            const isPublicAsset =
                nextUrl.pathname.startsWith("/_next") ||
                nextUrl.pathname.includes(".") || // Catch files like .css, .js, .png
                nextUrl.pathname.startsWith("/api/auth"); // Allow auth internal routes

            if (isAuthPage || isPublicAsset) {
                if (isLoggedIn && isAuthPage) {
                    return Response.redirect(new URL("/", nextUrl));
                }
                return true;
            }

            return isLoggedIn;
        },
    },
    providers: [],
    secret: process.env.AUTH_SECRET,
    trustHost: true,
} satisfies NextAuthConfig;
