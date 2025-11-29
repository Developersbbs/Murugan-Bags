"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { redirect } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { FormSubmitButton } from "@/components/shared/form/FormSubmitButton";

import { signupFields } from "./fields";
import { signupFormSchema } from "./schema";
import AuthProviders from "@/components/shared/auth/AuthProviders";
import { signUp } from "@/services/auth";

type FormData = z.infer<typeof signupFormSchema>;

export default function SignupForm() {
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: async (formData: FormData) => {
      const { name, email, password } = formData;
      return await signUp({ 
        name, 
        email, 
        password,
        role: "admin" // or "staff" depending on your needs
      });
    },
    onSuccess: () => {
      toast.success("Signup Success!", {
        description:
          "Account created successfully. Redirecting to the dashboard...",
        position: "top-center",
      });

      form.reset();
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (error: any) => {
      console.error("Signup error:", error);
      
      const errorMessage = error.message || "Failed to create account";
      
      // Handle specific validation errors
      if (errorMessage.toLowerCase().includes("email")) {
        form.setError("email", {
          message: "Email already exists or is invalid",
        });
      } else if (errorMessage.toLowerCase().includes("password")) {
        form.setError("password", {
          message: "Password requirements not met",
        });
      } else {
        // Show general error toast
        toast.error("Signup Failed", {
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
      return redirect("/");
    }
  }, [isSuccess]);

  return (
    <div className="w-full">
      <Typography variant="h2" className="mb-8">
        Create an Account
      </Typography>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {signupFields.map((formField) => (
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

          <FormField
            control={form.control}
            name="privacy"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>

                  <FormLabel className="!m-0">
                    I agree to the{" "}
                    <Typography
                      variant="a"
                      href="#"
                      className="md:!text-sm font-medium"
                    >
                      privacy policy
                    </Typography>
                  </FormLabel>
                </div>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormSubmitButton isPending={isPending} className="w-full">
            Create account
          </FormSubmitButton>
        </form>
      </Form>

      <Separator className="my-12" />
      <AuthProviders authType="Signup" />

      <div>
        <Typography variant="a" href="/login" className="md:!text-sm">
          Already have an account? Login
        </Typography>
      </div>
    </div>
  );
}
