import { Span } from '../../types';
import { nestedSetLeft, nestedSetRight } from './utils';

export class TreeNode {
  name: string;
  spans: Span[];
  left: number;
  right: number;
  children: TreeNode[];
  parent: TreeNode | null;

  constructor({ name, spans, left, right }: { name: string; spans: Span[]; left: number; right: number }) {
    this.name = name;
    this.spans = spans;
    this.left = left;
    this.right = right;
    this.children = [];
    this.parent = null;
  }

  addSpan(span: Span) {
    // expand our left/right based on this span
    this.left = Math.min(nestedSetLeft(span), this.left);
    this.right = Math.max(nestedSetRight(span), this.right);
    this.spans.push(span);
  }

  addChild(node: TreeNode) {
    node.parent = this;
    this.children.push(node);
  }

  isChild(span: Span): boolean {
    return nestedSetLeft(span) > this.left && nestedSetRight(span) < this.right;
  }

  findMatchingChild(span: Span): TreeNode | null {
    const name = nodeName(span);

    for (const child of this.children) {
      if (child.name === name) {
        return child;
      }
    }

    return null;
  }
}

export function createNode(s: Span): TreeNode {
  return new TreeNode({
    left: nestedSetLeft(s),
    right: nestedSetRight(s),
    name: nodeName(s),
    spans: [s],
  });
}

function nodeName(s: Span): string {
  let svcName = '';
  for (const a of s.attributes || []) {
    if (a.key === 'service.name' && a.value.stringValue) {
      svcName = a.value.stringValue;
    }
  }

  return `${svcName}:${s.name}`;
}
