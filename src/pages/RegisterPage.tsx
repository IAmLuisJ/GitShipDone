import { zodResolver } from "@hookform/resolvers/zod";
import { Github, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuthStore, type User } from "@/stores/authStore";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

type RegisterValues = z.infer<typeof registerSchema>;

type RegisterResponse = {
  user: Pick<User, "id" | "email" | "name"> &
    Partial<Pick<User, "avatarUrl" | "aiProvider" | "createdAt">>;
  accessToken: string;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-icon="inline-start">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.43Z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="currentColor"
        d="M6.41 13.9A6.01 6.01 0 0 1 6.1 12c0-.66.11-1.3.31-1.9V7.51H3.07A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.07 4.49l3.34-2.59Z"
      />
      <path
        fill="currentColor"
        d="M12 5.98c1.47 0 2.78.5 3.82 1.49l2.87-2.87C16.95 2.98 14.69 2 12 2a9.99 9.99 0 0 0-8.93 5.51l3.34 2.59C7.2 7.74 9.4 5.98 12 5.98Z"
      />
    </svg>
  );
}

function normalizeUser(user: RegisterResponse["user"]): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    aiProvider: user.aiProvider ?? null,
    createdAt: user.createdAt ?? new Date().toISOString(),
  };
}

function getApiError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "error" in error.response.data &&
    typeof error.response.data.error === "string"
  ) {
    return error.response.data.error;
  }

  return "Unable to create your account. Please try again.";
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [apiError, setApiError] = useState<string | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    setApiError(null);
    try {
      const response = await api.post<RegisterResponse>("/auth/register", values);
      setAuth(normalizeUser(response.data.user), response.data.accessToken);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setApiError(getApiError(error));
    }
  }

  return (
    <main
      data-testid="register-page"
      className="grid min-h-screen place-items-center bg-muted/30 px-5 py-10"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>Create your account</h1>
          </CardTitle>
          <CardDescription>
            Start tracking the projects you want to finish.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <Button asChild variant="outline">
              <a href="/api/auth/google">
                <GoogleIcon />
                Continue with Google
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/auth/github">
                <Github data-icon="inline-start" />
                Continue with GitHub
              </a>
            </Button>
          </div>

          <div className="my-6 h-px bg-border" />

          <Form {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {apiError ? (
                <p className="text-sm font-medium text-destructive" role="alert">
                  {apiError}
                </p>
              ) : null}

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : null}
                {form.formState.isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="font-medium text-foreground underline" to="/login">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
