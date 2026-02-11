import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <>
      <CardHeader className="text-center">
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Get started with ContentHQ</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </>
  );
}
