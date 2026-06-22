"use client";

import { useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import PostForm from "./PostForm";
import PostCard from "./PostCard";

interface Post {
  id: string;
  nickname: string;
  content: string;
  image_url: string | null;
  created_at: number;
  comment_count?: number;
}

interface TimelineProps {
  nickname: string;
  socket: Socket | null;
}

export default function Timeline({ nickname, socket }: TimelineProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    const res = await fetch("/api/posts");
    const data = await res.json();
    setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!socket) return;
    socket.on("post:new", (post: Post) => {
      setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
    });
    socket.on("comment:new", (comment: { post_id: string }) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === comment.post_id
            ? { ...p, comment_count: (p.comment_count ?? 0) + 1 }
            : p
        )
      );
    });
    return () => {
      socket.off("post:new");
      socket.off("comment:new");
    };
  }, [socket]);

  return (
    <div className="timeline">
      <PostForm nickname={nickname} socket={socket} onPostCreated={fetchPosts} />
      {loading ? (
        <div className="loading">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <p>아직 소식이 없어요</p>
          <span>첫 번째 판교 소식을 올려보세요!</span>
        </div>
      ) : (
        <div className="posts-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} nickname={nickname} socket={socket} />
          ))}
        </div>
      )}
    </div>
  );
}
