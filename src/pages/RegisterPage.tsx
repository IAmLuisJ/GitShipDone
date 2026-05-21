import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import api from "@/lib/api";
import {
  getAuthApiError,
  normalizeAuthUser,
  type AuthResponse,
} from "@/lib/authResponse";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
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
import { useAuthStore } from "@/stores/authStore";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

type RegisterValues = z.infer<typeof registerSchema>;

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
      const response = await api.post<AuthResponse>("/auth/register", values);
      setAuth(normalizeAuthUser(response.data.user), response.data.accessToken);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setApiError(
        getAuthApiError(error, "Unable to create your account. Please try again."),
      );
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
          <OAuthButtons />

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
