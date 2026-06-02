import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore, orderBy, query } from "firebase/firestore";

export type Post = {
  id: string;
  title: string;
  tag: string;
  content: string;
  contentHtml?: string;
  imageUrl?: string;
  date: string;
};

export const DEFAULT_POST_IMAGE = "/img/article-workspace.jpg";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyAR763_rkNDoRUWSa5krBgbYY6MQ0bp1Jg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "portfolio-433e3.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "portfolio-433e3",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "portfolio-433e3.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "90818969374",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:90818969374:web:cad68255161b54609e530f",
};

export function getPostPreview(post: Pick<Post, "content" | "contentHtml">) {
  const source = post.contentHtml || post.content;
  return source.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function getPublicPostImageSrc(imageUrl?: string) {
  const src = imageUrl?.trim() ?? "";
  if (!src || src.startsWith("data:image/")) return DEFAULT_POST_IMAGE;
  return src;
}

export async function getPublishedPosts(): Promise<Post[]> {
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(postsQuery);

    return snapshot.docs.map((entry) => {
      const data = entry.data() as {
        title?: string;
        tag?: string;
        content?: string;
        contentHtml?: string;
        imageUrl?: string;
        createdAt?: { toDate?: () => Date };
      };
      const date =
        data.createdAt?.toDate?.().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }) ?? "New";

      return {
        id: entry.id,
        title: data.title ?? "Untitled",
        tag: data.tag ?? "Blog",
        content: data.content ?? "",
        contentHtml: data.contentHtml ?? "",
        imageUrl: getPublicPostImageSrc(data.imageUrl),
        date,
      };
    });
  } catch {
    return [];
  }
}
