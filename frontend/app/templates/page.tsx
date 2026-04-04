import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TemplatesPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Boilerplate templates page.</CardDescription>
        </CardHeader>
        <CardContent>Templates Page</CardContent>
      </Card>
    </main>
  );
}
