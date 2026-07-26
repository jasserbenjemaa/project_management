"use client";
import { Eye, EyeOff } from "lucide-react";
import { DottedSeparator } from "@/components/dotted-separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signIn, type ActionResponse } from "@/app/actions/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { toast } from "sonner";

const initialState: ActionResponse = {
  success: false,
  message: "",
  errors: undefined,
};

export function SignInCard() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState<
    ActionResponse,
    FormData
  >(async (prevState: ActionResponse, formData: FormData) => {
    try {
      const result = await signIn(formData);
      if (result.success) {
        toast.success("Logged in successfully");
        router.push("/");
      }
      return result;
    } catch (e) {
      return {
        success: false,
        message: (e as Error).message || "error in signing in ",
        errors: undefined,
      };
    }
  }, initialState);
  return (
    <Card className="w-full max-w-sm gap-4">
      <form action={formAction}>
        <CardHeader>
          <Image
            src="/capgemini_logo.svg"
            alt="Capgemini Logo"
            className="mb-2 mt-3 h-auto"
            width={200}
            height={200}
          />
          <CardTitle className="text-xl">Login to your account</CardTitle>
          <CardDescription>
            if you are new here, please contact your administrator to get
            access.
          </CardDescription>
          <DottedSeparator className="p-3" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="enter your email"
                required
                autoComplete="email"
                disabled={isPending}
                aria-describedby="email-error"
                className={`h-9 ${state?.errors?.email ? "border-red-500" : ""}`}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>

              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  disabled={isPending}
                  placeholder="Enter your password"
                  aria-describedby="password-error"
                  className={`h-9 pr-10 ${
                    state?.errors?.password ? "border-red-500" : ""
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {state?.errors?.password && (
                <p id="password-error" className="text-sm text-red-500">
                  {state.errors.password[0]}
                </p>
              )}
            </div>
            {state?.errors?.email && (
              <p id="email-error" className="text-sm text-red-500">
                {state.errors.email[0]}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full h-8 mt-6"
            disabled={isPending}
          >
            {isPending ? "Logging in..." : "Login"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
