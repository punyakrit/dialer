import { RegisterForm } from "@/components/auth/RegisterForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/70 shadow-lg backdrop-blur">
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>
          Start calling in under two minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
