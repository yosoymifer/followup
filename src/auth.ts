import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                // For now, we only have the seeded organization user
                // In a real app, you'd have a User model.
                // For this MVP, we'll allow logging in with the organization name as email 
                // to simplify, but ideally we should add a User model.

                // Let's add a simple check for a hardcoded admin for testing or use the Org ID
                if (credentials.email === "admin@pascual.com" && credentials.password === "admin123") {
                    return {
                        id: "pascual_prod",
                        name: "Admin Pascual",
                        email: "admin@pascual.com",
                        organizationId: "pascual_prod",
                    };
                }

                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.organizationId = (user as any).organizationId;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.organizationId) {
                (session.user as any).organizationId = token.organizationId;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
});
