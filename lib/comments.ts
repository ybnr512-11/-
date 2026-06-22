export interface FlatComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  nickname: string;
  content: string;
  image_url: string | null;
  map_url: string | null;
  created_at: number;
}

export interface CommentNode extends FlatComment {
  children: CommentNode[];
}

export function buildCommentTree(comments: FlatComment[]): CommentNode[] {
  const byParent = new Map<string | null, FlatComment[]>();
  for (const comment of comments) {
    const key = comment.parent_id ?? null;
    const list = byParent.get(key);
    if (list) list.push(comment);
    else byParent.set(key, [comment]);
  }

  const build = (parentId: string | null): CommentNode[] =>
    (byParent.get(parentId) ?? []).map((comment) => ({
      ...comment,
      children: build(comment.id),
    }));

  return build(null);
}

export function collectDescendantIds(comments: FlatComment[], rootId: string): string[] {
  const ids: string[] = [];
  const walk = (parentId: string) => {
    for (const comment of comments) {
      if (comment.parent_id === parentId) {
        ids.push(comment.id);
        walk(comment.id);
      }
    }
  };
  walk(rootId);
  return ids;
}
