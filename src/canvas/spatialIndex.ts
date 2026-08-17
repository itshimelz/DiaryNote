import { BoundingBox, SpatialItem, doBoxesIntersect } from './geometry';

interface RTreeNode {
  box: BoundingBox;
  children: (RTreeNode | SpatialItem)[];
  isLeaf: boolean;
}

const MAX_ENTRIES = 16;

function createEmptyBox(): BoundingBox {
  return {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
}

function extendBox(target: BoundingBox, source: BoundingBox): void {
  target.minX = Math.min(target.minX, source.minX);
  target.minY = Math.min(target.minY, source.minY);
  target.maxX = Math.max(target.maxX, source.maxX);
  target.maxY = Math.max(target.maxY, source.maxY);
}

function getBoxArea(box: BoundingBox): number {
  return Math.max(0, box.maxX - box.minX) * Math.max(0, box.maxY - box.minY);
}

function enlargedArea(a: BoundingBox, b: BoundingBox): number {
  const minX = Math.min(a.minX, b.minX);
  const minY = Math.min(a.minY, b.minY);
  const maxX = Math.max(a.maxX, b.maxX);
  const maxY = Math.max(a.maxY, b.maxY);
  return (maxX - minX) * (maxY - minY);
}

/**
 * High-performance In-Memory 2D R-Tree Spatial Index for Canvas Virtualization.
 */
export class SpatialIndex {
  private root: RTreeNode;
  private itemMap: Map<string, SpatialItem>;

  constructor() {
    this.root = {
      box: createEmptyBox(),
      children: [],
      isLeaf: true,
    };
    this.itemMap = new Map();
  }

  public size(): number {
    return this.itemMap.size;
  }

  public clear(): void {
    this.root = {
      box: createEmptyBox(),
      children: [],
      isLeaf: true,
    };
    this.itemMap.clear();
  }

  public insert(item: SpatialItem): void {
    if (this.itemMap.has(item.id)) {
      this.remove(item.id);
    }
    this.itemMap.set(item.id, item);
    this.insertIntoNode(this.root, item);
  }

  public update(item: SpatialItem): void {
    this.insert(item);
  }

  public load(items: SpatialItem[]): void {
    this.clear();
    for (let i = 0; i < items.length; i++) {
      this.insert(items[i]);
    }
  }

  public remove(id: string): boolean {
    const item = this.itemMap.get(id);
    if (!item) return false;
    this.itemMap.delete(id);
    const removed = this.removeFromNode(this.root, item);
    if (this.root.children.length === 1 && !this.root.isLeaf) {
      this.root = this.root.children[0] as RTreeNode;
    }
    return removed;
  }

  public search(searchBox: BoundingBox): SpatialItem[] {
    const results: SpatialItem[] = [];
    this.searchNode(this.root, searchBox, results);
    return results;
  }

  public searchIds(searchBox: BoundingBox): Set<string> {
    const results = this.search(searchBox);
    const idSet = new Set<string>();
    for (let i = 0; i < results.length; i++) {
      idSet.add(results[i].id);
    }
    return idSet;
  }

  public all(): SpatialItem[] {
    return Array.from(this.itemMap.values());
  }

  private insertIntoNode(node: RTreeNode, item: SpatialItem): void {
    extendBox(node.box, item);

    if (node.isLeaf) {
      node.children.push(item);
      if (node.children.length > MAX_ENTRIES) {
        this.splitNode(node);
      }
      return;
    }

    // Choose best child node with least area enlargement
    let bestChild = node.children[0] as RTreeNode;
    let minEnlargement = Infinity;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i] as RTreeNode;
      const enlargement = enlargedArea(child.box, item) - getBoxArea(child.box);
      if (enlargement < minEnlargement) {
        minEnlargement = enlargement;
        bestChild = child;
      }
    }

    this.insertIntoNode(bestChild, item);
  }

  private splitNode(node: RTreeNode): void {
    const children = node.children;
    const isLeaf = node.isLeaf;

    // Split children into two groups
    const mid = Math.floor(children.length / 2);
    const group1 = children.slice(0, mid);
    const group2 = children.slice(mid);

    const box1 = createEmptyBox();
    for (const c of group1) {
      extendBox(box1, 'id' in c ? c : (c as RTreeNode).box);
    }

    const box2 = createEmptyBox();
    for (const c of group2) {
      extendBox(box2, 'id' in c ? c : (c as RTreeNode).box);
    }

    const node1: RTreeNode = { box: box1, children: group1, isLeaf };
    const node2: RTreeNode = { box: box2, children: group2, isLeaf };

    node.isLeaf = false;
    node.children = [node1, node2];
    node.box = createEmptyBox();
    extendBox(node.box, box1);
    extendBox(node.box, box2);
  }

  private removeFromNode(node: RTreeNode, item: SpatialItem): boolean {
    if (!doBoxesIntersect(node.box, item)) {
      return false;
    }

    if (node.isLeaf) {
      const idx = node.children.findIndex((c) => 'id' in c && (c as SpatialItem).id === item.id);
      if (idx !== -1) {
        node.children.splice(idx, 1);
        this.recalculateBox(node);
        return true;
      }
      return false;
    }

    let removed = false;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i] as RTreeNode;
      if (this.removeFromNode(child, item)) {
        removed = true;
        if (child.children.length === 0) {
          node.children.splice(i, 1);
          i--;
        }
        break;
      }
    }

    if (removed) {
      this.recalculateBox(node);
    }
    return removed;
  }

  private recalculateBox(node: RTreeNode): void {
    node.box = createEmptyBox();
    for (const c of node.children) {
      extendBox(node.box, 'id' in c ? c : (c as RTreeNode).box);
    }
  }

  private searchNode(node: RTreeNode, searchBox: BoundingBox, results: SpatialItem[]): void {
    if (!doBoxesIntersect(node.box, searchBox)) {
      return;
    }

    if (node.isLeaf) {
      for (let i = 0; i < node.children.length; i++) {
        const item = node.children[i] as SpatialItem;
        if (doBoxesIntersect(item, searchBox)) {
          results.push(item);
        }
      }
      return;
    }

    for (let i = 0; i < node.children.length; i++) {
      this.searchNode(node.children[i] as RTreeNode, searchBox, results);
    }
  }
}
