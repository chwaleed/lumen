import type { FileNode } from "./types";

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

function sortNodes(nodes: FileNode[]) {
  return [...nodes].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "folder" ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

export function addNode(nodes: FileNode[], parentId: string, newNode: FileNode): FileNode[] {
  if (parentId === "root") {
    return sortNodes([...nodes, newNode]);
  }

  return nodes.map((node) => {
    if (node.id === parentId && node.type === "folder") {
      return { ...node, children: sortNodes([...(node.children || []), newNode]), isOpen: true };
    }
    if (node.children) return { ...node, children: addNode(node.children, parentId, newNode) };
    return node;
  });
}

function findNode(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    if (node.children) {
      const childNode = findNode(node.children, id);
      if (childNode) {
        return childNode;
      }
    }
  }

  return null;
}

function hasDescendant(node: FileNode, descendantId: string): boolean {
  return (node.children ?? []).some(
    (childNode) => childNode.id === descendantId || hasDescendant(childNode, descendantId),
  );
}

export function moveNode(nodes: FileNode[], nodeId: string, parentId: string): FileNode[] {
  const nodeToMove = findNode(nodes, nodeId);

  if (!nodeToMove || nodeId === parentId || hasDescendant(nodeToMove, parentId)) {
    return nodes;
  }

  return addNode(deleteNode(nodes, nodeId), parentId, nodeToMove);
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

export function preserveOpenState(nextNodes: FileNode[], currentNodes: FileNode[]): FileNode[] {
  const openStateById = new Map<string, boolean>();

  const collectOpenState = (nodes: FileNode[]) => {
    for (const node of nodes) {
      if (node.type === "folder") {
        openStateById.set(node.id, Boolean(node.isOpen));
        collectOpenState(node.children ?? []);
      }
    }
  };

  collectOpenState(currentNodes);

  const applyOpenState = (nodes: FileNode[]): FileNode[] =>
    nodes.map((node) => ({
      ...node,
      isOpen: node.type === "folder" ? (openStateById.get(node.id) ?? node.isOpen ?? false) : undefined,
      children: node.children ? applyOpenState(node.children) : undefined,
    }));

  return applyOpenState(nextNodes);
}
