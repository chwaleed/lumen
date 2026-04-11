import { EditorWorkspace } from "@/app/project/[id]/components/editor-workspace";

type ProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return <EditorWorkspace projectId={id} />;
}
