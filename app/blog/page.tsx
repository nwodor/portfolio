import type { Metadata } from "next";
import { cache } from "react";
import PortfolioClient from "../portfolio-client";
import { getPostPreview, getPublicPostImageSrc, getPublishedPosts } from "../blog-data";

const blogUrl = "https://nwodor.xyz/blog";
const getBlogPosts = cache(getPublishedPosts);

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const posts = await getBlogPosts();
  const latestPost = posts[0];
  const title = latestPost
    ? `${latestPost.title} | Success Nwodor-Joseph Blog`
    : "Blog | Success Nwodor-Joseph";
  const description = latestPost
    ? getPostPreview(latestPost).slice(0, 155)
    : "Technical notes, project writeups, and automation articles from Success Nwodor-Joseph.";
  const image = getPublicPostImageSrc(latestPost?.imageUrl);

  return {
    title,
    description,
    alternates: {
      canonical: blogUrl,
    },
    openGraph: {
      title,
      description,
      url: blogUrl,
      siteName: "Success Nwodor-Joseph",
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: latestPost?.title ?? "Success Nwodor-Joseph blog",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return <PortfolioClient initialSection="skills" initialPosts={posts} />;
}
