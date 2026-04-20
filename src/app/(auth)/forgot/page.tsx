import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/70 shadow-lg backdrop-blur">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Emailed password reset is on the roadmap. For now, contact support.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
