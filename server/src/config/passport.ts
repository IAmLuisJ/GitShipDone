import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import { eq, or } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

/**
 * Configure Google OAuth 2.0 strategy for Passport.js.
 * Find-or-create user by google_id or email.
 */
export function configurePassport(): void {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn(
      "[Passport] Google OAuth not configured — GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing",
    );
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
      ) => {
        try {
          const email =
            profile.emails?.[0]?.value?.toLowerCase() || undefined;
          const googleId = profile.id;
          const name =
            profile.displayName ||
            `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim() ||
            "Google User";

          // Find user by google_id or email
          const conditions = [eq(users.googleId, googleId)];
          if (email) {
            conditions.push(eq(users.email, email));
          }

          const [existingUser] = await db
            .select({
              id: users.id,
              email: users.email,
              name: users.name,
              googleId: users.googleId,
            })
            .from(users)
            .where(or(...conditions))
            .limit(1);

          if (existingUser) {
            // Update google_id if this user was found by email but hasn't linked Google yet
            if (!existingUser.googleId) {
              await db
                .update(users)
                .set({ googleId })
                .where(eq(users.id, existingUser.id));
            }
            return done(null, {
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name,
            });
          }

          // Create new user (no password_hash for OAuth-only users)
          if (!email) {
            return done(new Error("Google account has no email"), undefined);
          }

          const [newUser] = await db
            .insert(users)
            .values({
              email,
              name,
              googleId,
              passwordHash: null,
            })
            .returning({ id: users.id, email: users.email, name: users.name });

          return done(null, {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          });
        } catch (err) {
          return done(err as Error, undefined);
        }
      },
    ),
  );
}
