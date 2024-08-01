import { Span } from '../../types';

export function nestedSetLeft(span: Span): number {
  if (span.attributes) {
    for (const a of span.attributes) {
      if (a.key === 'nestedSetLeft') {
        return parseInt(a.value.intValue || '0', 10);
      }
    }
  }

  throw new Error('nestedSetLeft not found!');
}

export function nestedSetRight(span: Span): number {
  if (span.attributes) {
    for (const a of span.attributes) {
      if (a.key === 'nestedSetRight') {
        return parseInt(a.value.intValue || '0', 10);
      }
    }
  }

  throw new Error('nestedSetRight not found!');
}
