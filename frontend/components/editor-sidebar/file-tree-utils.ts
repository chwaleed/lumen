import { FileNode } from "./types";

export const initialFiles: FileNode[] = [
  { id: "1", name: "main.tex", type: "file" },
  { id: "2", name: "references.bib", type: "file" },
  {
    id: "3",
    name: "images",
    type: "folder",
    isOpen: true,
    children: [{ id: "4", name: "figure1.png", type: "file" }],
  },
];

const createId = () => Math.random().toString(36).slice(2, 11);

export function createNewFileNode(): FileNode {
  return { id: createId(), name: "new_file.tex", type: "file" };
}

export function createNewFolderNode(): FileNode {
  return {
    id: createId(),
    name: "New Folder",
    type: "folder",
    isOpen: true,
    children: [],
  };
}

export function updateNode(
  nodes: FileNode[],
  id: string,
  updater: (node: FileNode) => FileNode,
): FileNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    if (node.children) return { ...node, children: updateNode(node.children, id, updater) };
    return node;
  });
}

export function deleteNode(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => {
      if (node.children) return { ...node, children: deleteNode(node.children, id) };
      return node;
    });
}

export function addNode(nodes: FileNode[], parentId: string, newNode: FileNode): FileNode[] {
  if (parentId === "root") {
    return [...nodes, newNode];
  }

  return nodes.map((node) => {
    if (node.id === parentId && node.type === "folder") {
      return { ...node, children: [...(node.children || []), newNode], isOpen: true };
    }
    if (node.children) return { ...node, children: addNode(node.children, parentId, newNode) };
    return node;
  });
}

export function duplicateNode(nodes: FileNode[], id: string): FileNode[] {
  const nextNodes = [...nodes];
  const index = nextNodes.findIndex((node) => node.id === id);

  if (index !== -1) {
    const duplicate = JSON.parse(JSON.stringify(nextNodes[index])) as FileNode;

    const assignNewIds = (node: FileNode) => {
      node.id = createId();
      if (node.children) node.children.forEach(assignNewIds);
    };

    assignNewIds(duplicate);
    duplicate.name = `${duplicate.name} (copy)`;
    nextNodes.splice(index + 1, 0, duplicate);
    return nextNodes;
  }

  return nextNodes.map((node) => {
    if (node.children) return { ...node, children: duplicateNode(node.children, id) };
    return node;
  });
}
