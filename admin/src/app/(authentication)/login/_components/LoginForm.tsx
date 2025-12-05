"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { redirect, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Typography from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FormSubmitButton } from "@/components/shared/form/FormSubmitButton";

import { loginFields } from "./fields";
import { loginFormSchema } from "./schema";
import AuthProviders from "@/components/shared/auth/AuthProviders";
import { signIn } from "@/services/auth";

type FormData = z.infer<typeof loginFormSchema>;

export default function LoginForm() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const form = useForm<FormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "fathimaamreen351@gmail.com",
      password: "123456",
    },
  });

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: async (formData: FormData) => {
      const { email, password } = formData;
      return await signIn({ email, password });
    },
    onSuccess: () => {
      toast.success("Login Success!", {
        description: searchParams.get("redirect_to")
          ? "Redirecting to your page..."
          : "Redirecting to the dashboard...",
        position: "top-center",
      });

      form.reset();
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (error: any) => {
      console.error("Login error:", error);

      const errorMessage = error.message || "Failed to login";

      // Handle specific validation errors
      if (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("invalid")) {
        form.setError("email", {
          message: "Invalid email or password",
        });
      } else if (errorMessage.toLowerCase().includes("password")) {
        form.setError("password", {
          message: "Invalid email or password",
        });
      } else {
        // Show general error toast
        toast.error("Login Failed", {
          description: errorMessage,
          position: "top-center",
        });
      }
    },
  });

  const onSubmit = (formData: FormData) => {
    mutate(formData);
  };

  useEffect(() => {
    if (isSuccess) {
      const redirectTo = searchParams.get("redirect_to");

      return redirect(redirectTo || "/");
    }
  }, [isSuccess, searchParams]);

  return (
    <div className="w-full">
      <Typography variant="h2" className="mb-8">
        Login
      </Typography>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {loginFields.map((formField) => (
            <FormField
              key={`form-field-${formField.name}`}
              control={form.control}
              name={formField.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{formField.label}</FormLabel>
                  <FormControl>
                    <Input
                      type={formField.inputType}
                      placeholder={formField.placeholder}
                      autoComplete={formField.autoComplete}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <FormSubmitButton isPending={isPending} className="w-full">
            Login
          </FormSubmitButton>
        </form>
      </Form>

      <Separator className="my-12" />

      <AuthProviders />

      <div className="flex flex-wrap justify-between gap-4 w-full">
        <Typography variant="a" href="/forgot-password" className="md:!text-sm">
          Forgot password?
        </Typography>
        {/* <Typography variant="a" href="/signup" className="md:!text-sm">
          Create an account
        </Typography> */}
      </div>
    </div>
  );
}
