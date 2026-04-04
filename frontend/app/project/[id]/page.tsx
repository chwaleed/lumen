import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Project</CardTitle>
          <CardDescription>Boilerplate dynamic project page.</CardDescription>
        </CardHeader>
        <CardContent>Project Page: {id}</CardContent>
      </Card>
    </main>
  );
}
