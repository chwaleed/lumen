import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProjectsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Boilerplate projects page.</CardDescription>
        </CardHeader>
        <CardContent>Projects Page</CardContent>
      </Card>
    </main>
  );
}
