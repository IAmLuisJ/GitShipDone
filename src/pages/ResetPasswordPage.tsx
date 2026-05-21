import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";

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
import api from "@/lib/api";
import { getAuthApiError } from "@/lib/authResponse";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmNewPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "Passwords must match",
    path: ["confirmNewPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordValues) {
    if (!token) {
      return;
    }

    setApiError(null);
    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: values.newPassword,
      });
      setIsComplete(true);
    } catch (error) {
      setApiError(
        getAuthApiError(error, "Unable to reset your password. Try again."),
      );
    }
  }

  if (!token) {
    return (
      <main
        data-testid="reset-password-page"
        className="grid min-h-screen place-items-center bg-muted/30 px-5 py-10"
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              <h1>Reset link needed</h1>
            </CardTitle>
            <CardDescription>
              The reset token is missing. Request a new link to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main
      data-testid="reset-password-page"
      className="grid min-h-screen place-items-center bg-muted/30 px-5 py-10"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>Choose a new password</h1>
          </CardTitle>
          <CardDescription>
            Use a password with at least 8 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isComplete ? (
            <p className="text-sm font-medium text-foreground" role="status">
              Password updated!{" "}
              <Link className="underline" to="/login">
                Sign in.
              </Link>
            </p>
          ) : (
            <Form {...form}>
              <form
                noValidate
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-4"
              >
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
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
                <FormField
                  control={form.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
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
                    <LoaderCircle
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                  ) : null}
                  {form.formState.isSubmitting ? "Updating..." : "Update password"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
