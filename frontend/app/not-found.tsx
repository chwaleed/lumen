import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>404</CardTitle>
          <CardDescription>The page you requested was not found.</CardDescription>
        </CardHeader>
        <CardContent>404 - Not Found</CardContent>
      </Card>
    </main>
  );
}
