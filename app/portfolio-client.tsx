"use client";

import emailjs from "@emailjs/browser";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Marquee from "react-fast-marquee";
import {
  ArrowDown,
  ArrowUpRight,
  LogOut,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import type { IconType } from "react-icons";
import {
  FaCode,
  FaCopy,
  FaCss3Alt,
  FaDatabase,
  FaEnvelope,
  FaGithub,
  FaGitAlt,
  FaHtml5,
  FaJs,
  FaLinkedinIn,
  FaLock,
  FaMapMarkerAlt,
  FaPenNib,
  FaPhp,
  FaPlug,
  FaPython,
  FaReact,
  FaRobot,
  FaServer,
  FaWhatsapp,
} from "react-icons/fa";
import {
  SiBootstrap,
  SiClaude,
  SiDjango,
  SiFirebase,
  SiGithubcopilot,
  SiMysql,
  SiN8N,
  SiNextdotjs,
  SiOpenai,
  SiPostman,
  SiRailway,
  SiTypescript,
} from "react-icons/si";
import BottomNav from "./bottom-nav";
import {
  firebaseConfig,
  getPublicPostImageSrc,
  getPostPreview,
  type Post,
} from "./blog-data";
import { useTypewriter } from "./use-typewriter";

type PostDraft = {
  title: string;
  tag: string;
  content: string;
  contentHtml: string;
  imageUrl: string;
};

type MammothBrowserModule = {
  images?: {
    imgElement: (
      converter: (image: {
        altText?: string;
        contentType: string;
        read: (encoding: "base64") => Promise<string>;
      }) => Promise<{ src: string; alt?: string }>,
    ) => unknown;
  };
  convertToHtml?: (input: {
    arrayBuffer: ArrayBuffer;
  }, options?: Record<string, unknown>) => Promise<{ value: string; messages: { type: string; message: string }[] }>;
  default?: {
    images?: MammothBrowserModule["images"];
    convertToHtml?: (input: {
      arrayBuffer: ArrayBuffer;
    }, options?: Record<string, unknown>) => Promise<{ value: string; messages: { type: string; message: string }[] }>;
  };
};

type DocxPreviewModule = {
  renderAsync?: (
    data: Blob | ArrayBuffer,
    bodyContainer: HTMLElement,
    styleContainer?: HTMLElement,
    options?: Record<string, unknown>,
  ) => Promise<void>;
  default?: DocxPreviewModule;
};

type WordImportResult = {
  html: string;
  text: string;
  source: "rendered" | "mammoth";
  warnings: string[];
};

type ContactDraft = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const navItems = [
  ["home", "Home"],
  ["about", "About"],
  ["services", "Services"],
  ["experience", "Exp"],
  ["portfolio", "Work"],
  ["skills", "Blog"],
  ["contact", "Contact"],
] as const;

type SectionId = (typeof navItems)[number][0];

const EMAILJS_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "uSpzM5E6mlIIeSi5z";
const EMAILJS_SERVICE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? "service_qajjgi9";
const EMAILJS_TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ?? "template_q2bustc";

const LS_KEY = "portfolio_blog_posts";

// Hero intro lines, typed out in order on load. Kept module-level so the
// reference stays stable for the typewriter hook.
const HERO_GREETING = "Hello, I'm";
const HERO_NAME_1 = "Nwodor-Joseph";
const HERO_NAME_2 = "Success";
const HERO_TITLE = "IT administrator, Software Developer & Data analyst";
const HERO_DESC =
  "Third-year IT student at Concordia University of Edmonton, building full-stack web apps that solve real problems. From RESTful APIs to responsive frontends, I ship clean, maintainable code.";
const HERO_SEGMENTS = [HERO_GREETING, HERO_NAME_1, HERO_NAME_2, HERO_TITLE, HERO_DESC];

const services = [
  {
    num: "01 //",
    title: "Full-Stack Web Apps",
    Icon: FaServer,
    text: "Web apps built end to end, from the database schema up to the interface people actually click.",
    tags: ["Python", "Django", "JavaScript", "MySQL"],
  },
  {
    num: "02 //",
    title: "API Development",
    Icon: FaPlug,
    text: "REST APIs with real auth, validation, and docs another developer can pick up without guessing.",
    tags: ["REST APIs", "MVC", "JSON", "Git"],
  },
  {
    num: "03 //",
    title: "Data & Database",
    Icon: FaDatabase,
    text: "Schema design, SQL, and data integrity that turn messy data into something you can actually decide on.",
    tags: ["SQL", "MySQL", "Excel", "Data Analysis"],
  },
];

const strengths = [
  "Communication & Problem-Solving",
  "Full-Stack Web Development",
  "Database Design & SQL",
  "REST API Design & Integration",
  "AI-Augmented Development",
  "CRM & Customer Management Systems",
];

const aboutCards: Array<{ title: string; text: string; Icon: IconType }> = [
  { title: "Full-Stack Dev", text: "Python, Django, JS, PHP, front to back.", Icon: FaCode },
  { title: "Data & SQL", text: "MySQL and Excel for query, integrity, and insight.", Icon: FaDatabase },
  { title: "API Integration", text: "RESTful APIs, MVC architecture, clean code.", Icon: FaPlug },
  { title: "AI-Augmented", text: "I use AI to draft and review, not to skip the thinking.", Icon: FaRobot },
];

const techStack: Array<{ name: string; Icon: IconType; featured?: boolean }> = [
  { name: "React", Icon: FaReact, featured: true },
  { name: "Next.js", Icon: SiNextdotjs },
  { name: "TypeScript", Icon: SiTypescript },
  { name: "JavaScript", Icon: FaJs },
  { name: "Python", Icon: FaPython },
  { name: "Django", Icon: SiDjango },
  { name: "PHP", Icon: FaPhp },
  { name: "MySQL", Icon: SiMysql },
  { name: "Firebase", Icon: SiFirebase },
  { name: "OpenAI", Icon: SiOpenai },
  { name: "Claude", Icon: SiClaude },
  { name: "n8n", Icon: SiN8N },
  { name: "Railway", Icon: SiRailway },
  { name: "GitHub Copilot", Icon: SiGithubcopilot },
  { name: "HTML5", Icon: FaHtml5 },
  { name: "CSS3", Icon: FaCss3Alt },
  { name: "Bootstrap", Icon: SiBootstrap },
  { name: "REST APIs", Icon: SiPostman },
  { name: "Git", Icon: FaGitAlt },
];

const workExperience = [
  {
    date: "Jul 2025 – Present",
    role: "Customer Experience Coworker Level 3",
    company: "IKEA, Edmonton, AB",
    desc: "Providing excellent customer service, using IKEA software to accurately track inventory, and resolving customer issues efficiently while maintaining stock integrity.",
  },
  {
    date: "Oct 2024 – Jul 2025",
    role: "Carts Co-worker",
    company: "IKEA, Edmonton, AB",
    desc: "Coordinated with warehouse and pickup teams to ensure merchandise integrity, monitored loading zone operations, and reported equipment issues to management.",
  },
  {
    date: "Oct 2022 – Nov 2023",
    role: "Software Engineering Intern",
    company: "Lendsqr",
    desc: "Assisted in designing, developing and testing software applications. Wrote clean, maintainable code, used SQL to query databases, and maintained data integrity and confidentiality.",
  },
];

const education = [
  {
    date: "Current",
    role: "BSc. Information Technology",
    company: "Concordia University of Edmonton, Minor in Business",
    desc: "3rd year IT student focused on software engineering, system design, and business fundamentals.",
  },
  {
    date: "Prior",
    role: "Advanced Diploma in Software Engineering",
    company: "Aptech Computer Education, Lagos, Nigeria",
    desc: "Foundational and advanced training in software engineering principles, programming, and application development.",
  },
];

function getLocalPosts(): Post[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]") as Post[];
  } catch {
    return [];
  }
}

function saveLocalPosts(posts: Post[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(posts));
}

function isValidImageSrc(src: string) {
  return (
    !src ||
    src.startsWith("/") ||
    src.startsWith("https://") ||
    src.startsWith("http://") ||
    src.startsWith("data:image/")
  );
}

function getPostImageSrc(post: Post) {
  return getPublicPostImageSrc(post.imageUrl);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Unable to read file.")));
    reader.readAsDataURL(file);
  });
}

function sanitizePostHtml(html: string) {
  if (typeof window === "undefined") return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const allowedTags = new Set([
    "A",
    "B",
    "BLOCKQUOTE",
    "BR",
    "CODE",
    "DIV",
    "EM",
    "FIGURE",
    "FIGCAPTION",
    "H1",
    "H2",
    "H3",
    "H4",
    "HR",
    "IMG",
    "LI",
    "OL",
    "P",
    "PRE",
    "SECTION",
    "SPAN",
    "STRONG",
    "TABLE",
    "TBODY",
    "TD",
    "TH",
    "THEAD",
    "TR",
    "U",
    "UL",
  ]);

  const cleanNode = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const element = child as HTMLElement;
      if (!allowedTags.has(element.tagName)) {
        const replacementNodes = Array.from(element.childNodes);
        element.replaceWith(...replacementNodes);
        replacementNodes.forEach(cleanNode);
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        const attrName = attribute.name.toLowerCase();
        if (element.tagName === "A" && attrName === "href") {
          const href = element.getAttribute("href") ?? "";
          if (/^(https?:|mailto:|tel:)/i.test(href)) {
            element.setAttribute("target", "_blank");
            element.setAttribute("rel", "noopener noreferrer");
            return;
          }
        }
        if (element.tagName === "IMG") {
          if (attrName === "src") {
            const src = element.getAttribute("src") ?? "";
            if (/^(data:image\/|blob:|https?:|\/)/i.test(src)) return;
          }
          if (attrName === "alt") return;
        }
        if (attrName === "style") {
          const safeStyle = attribute.value
            .split(";")
            .map((rule) => rule.trim())
            .filter((rule) =>
              /^(text-align|font-weight|font-style|text-decoration|width|max-width|height|margin-left|padding-left):/i.test(
                rule,
              ),
            )
            .join("; ");
          if (safeStyle) {
            element.setAttribute("style", safeStyle);
            return;
          }
        }
        element.removeAttribute(attribute.name);
      });

      cleanNode(element);
    });
  };

  cleanNode(doc.body);
  return doc.body.firstElementChild?.innerHTML.trim() ?? "";
}

function getEditorTextFromHtml(html: string) {
  if (typeof window === "undefined") return "";

  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines: string[] = [];

  const appendLine = (line: string) => {
    const cleaned = line.replace(/\s+/g, " ").trim();
    if (cleaned) lines.push(cleaned);
  };

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      appendLine(node.textContent ?? "");
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const text = element.textContent ?? "";

    if (element.tagName === "IMG") {
      appendLine(`[Image: ${element.getAttribute("alt") || "imported diagram"}]`);
      return;
    }

    if (element.tagName === "LI") {
      appendLine(`- ${text}`);
      return;
    }

    if (element.tagName === "UL" || element.tagName === "OL") {
      element.querySelectorAll("li").forEach((item) => appendLine(`- ${item.textContent ?? ""}`));
      return;
    }

    if (element.tagName === "TABLE") {
      element.querySelectorAll("tr").forEach((row) => {
        const cells = Array.from(row.querySelectorAll("th,td"))
          .map((cell) => cell.textContent?.replace(/\s+/g, " ").trim())
          .filter(Boolean);
        appendLine(cells.join(" | "));
      });
      return;
    }

    appendLine(text);
  });

  return lines.join("\n\n");
}

function getTextScore(text: string) {
  return text.replace(/\s+/g, " ").trim().length;
}

async function inlineBlobImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      const src = image.getAttribute("src") ?? "";
      if (!src.startsWith("blob:")) return;

      const response = await fetch(src);
      const blob = await response.blob();
      image.setAttribute("src", await readFileAsDataUrl(blobToFile(blob, "word-diagram")));
      URL.revokeObjectURL(src);
    }),
  );
}

function blobToFile(blob: Blob, fileName: string) {
  return new File([blob], fileName, { type: blob.type });
}

async function renderWordFileToHtml(file: File): Promise<WordImportResult | null> {
  if (typeof window === "undefined") return null;

  const docxPreview = (await import("docx-preview")) as DocxPreviewModule;
  const renderAsync = docxPreview.renderAsync ?? docxPreview.default?.renderAsync;
  if (!renderAsync) return null;

  const wrapper = document.createElement("div");
  const styleContainer = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "900px";
  wrapper.style.pointerEvents = "none";
  wrapper.setAttribute("aria-hidden", "true");
  document.body.appendChild(wrapper);
  document.body.appendChild(styleContainer);

  try {
    await renderAsync(await file.arrayBuffer(), wrapper, styleContainer, {
      className: "imported-docx",
      inWrapper: false,
      ignoreFonts: true,
      ignoreHeight: true,
      ignoreWidth: false,
      renderComments: false,
      renderEndnotes: true,
      renderFooters: true,
      renderFootnotes: true,
      renderHeaders: true,
    });
    await inlineBlobImages(wrapper);

    const html = sanitizePostHtml(wrapper.innerHTML);
    const text = getEditorTextFromHtml(html);
    return html && text
      ? {
          html,
          text,
          source: "rendered",
          warnings: [],
        }
      : null;
  } finally {
    wrapper.remove();
    styleContainer.remove();
  }
}

async function convertWordFileWithMammoth(file: File): Promise<WordImportResult | null> {
  const mammoth = (await import("mammoth/mammoth.browser.js")) as MammothBrowserModule;
  const convertToHtml = mammoth.convertToHtml ?? mammoth.default?.convertToHtml;
  const images = mammoth.images ?? mammoth.default?.images;
  if (!convertToHtml) {
    throw new Error("Word import is unavailable in this browser build.");
  }

  const result = await convertToHtml(
    { arrayBuffer: await file.arrayBuffer() },
    {
      convertImage: images?.imgElement(async (image) => ({
        src: `data:${image.contentType};base64,${await image.read("base64")}`,
        alt: image.altText || "Imported Word diagram",
      })),
      includeDefaultStyleMap: true,
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Heading 1'] => h2:fresh",
        "p[style-name='Heading 2'] => h3:fresh",
        "p[style-name='Heading 3'] => h4:fresh",
      ],
    },
  );
  const html = sanitizePostHtml(result.value);
  const text = getEditorTextFromHtml(html);
  return html && text
    ? {
        html,
        text,
        source: "mammoth",
        warnings: result.messages.map((message) => message.message),
      }
    : null;
}

async function importWordFile(file: File): Promise<WordImportResult> {
  const [rendered, mammoth] = await Promise.allSettled([
    renderWordFileToHtml(file),
    convertWordFileWithMammoth(file),
  ]);

  const candidates = [rendered, mammoth]
    .flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []))
    .sort((a, b) => getTextScore(b.text) - getTextScore(a.text));

  if (candidates.length) return candidates[0];

  const errors = [rendered, mammoth]
    .flatMap((result) => (result.status === "rejected" ? [result.reason] : []))
    .map((error) => (error instanceof Error ? error.message : String(error)));
  throw new Error(errors[0] || "That Word file did not contain readable blog content.");
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({
  tag,
  title,
  accent,
}: {
  tag: string;
  title: string;
  accent: string;
}) {
  return (
    <>
      <p className="section-tag">{tag}</p>
      <div className="lime-divider" />
      <h2 className="section-title">
        {title} <em>{accent}</em>
      </h2>
    </>
  );
}

function ProjectThumb({ type }: { type: "cars" | "finance" }) {
  if (type === "cars") return <CarRentalThumb />;
  return <FinanceThumb />;
}

function CarRentalThumb() {
  return (
    <div className="project-thumb cars-thumb">
      <svg viewBox="0 0 420 180" aria-hidden="true">
        <rect x="0" y="0" width="420" height="28" fill="#111827" />
        <rect x="12" y="10" width="60" height="8" rx="4" fill="#c8f135" opacity="0.85" />
        <rect x="310" y="9" width="50" height="10" rx="5" fill="#c8f135" opacity="0.2" />
        <rect x="368" y="9" width="40" height="10" rx="5" fill="#c8f135" opacity="0.9" />
        <rect x="12" y="38" width="260" height="20" rx="5" fill="#1e293b" />
        <rect x="20" y="44" width="80" height="8" rx="4" fill="#2a3a52" />
        <rect x="280" y="38" width="128" height="20" rx="5" fill="#c8f135" opacity="0.85" />
        {[12, 142, 272].map((x, i) => (
          <g key={x} transform={`translate(${x} 68)`}>
            <rect width={i === 2 ? 136 : 120} height="100" rx="6" fill="#1e293b" />
            <ellipse cx={i === 2 ? 68 : 60} cy="32" rx={i === 2 ? 42 : 38} ry="16" fill="#2a3a52" />
            <rect x={i === 2 ? 36 : 32} y="20" width={i === 2 ? 64 : 56} height="18" rx="6" fill="#374151" />
            <rect x={i === 2 ? 46 : 40} y="14" width={i === 2 ? 44 : 38} height="12" rx="4" fill="#4b5563" />
            <circle cx={i === 2 ? 48 : 41} cy="39" r="7" fill="#111827" />
            <circle cx={i === 2 ? 48 : 41} cy="39" r="4" fill="#6b7280" />
            <circle cx={i === 2 ? 88 : 79} cy="39" r="7" fill="#111827" />
            <circle cx={i === 2 ? 88 : 79} cy="39" r="4" fill="#6b7280" />
            <rect x="8" y="58" width={i === 2 ? 70 : 60} height="6" rx="3" fill="#2a3a52" />
            <rect x="8" y="70" width={i === 2 ? 48 : 40} height="8" rx="4" fill="#c8f135" opacity="0.85" />
          </g>
        ))}
      </svg>
      <div className="project-thumb-accent" />
    </div>
  );
}

function FinanceThumb() {
  return (
    <div className="project-thumb finance-thumb">
      <svg viewBox="0 0 420 180" aria-hidden="true">
        <rect x="0" y="0" width="60" height="180" fill="#0d1426" />
        {[18, 34, 50, 66, 82, 98].map((y, i) => (
          <rect
            key={y}
            x="10"
            y={y}
            width={i === 0 ? 40 : 28 + i * 2}
            height={i === 0 ? 6 : 5}
            rx="3"
            fill={i === 1 ? "#c8f135" : "#1e2d4a"}
            opacity={i === 1 ? 0.9 : 1}
          />
        ))}
        <rect x="68" y="12" width="344" height="156" rx="6" fill="#111827" />
        <rect x="76" y="20" width="120" height="8" rx="4" fill="#1e2d4a" />
        <rect x="358" y="18" width="46" height="12" rx="6" fill="#c8f135" opacity="0.85" />
        {[76, 180, 284].map((x) => (
          <rect key={x} x={x} y="40" width="96" height="44" rx="5" fill="#162033" />
        ))}
        <rect x="76" y="94" width="190" height="66" rx="5" fill="#162033" />
        {[16, 26, 34, 22, 42, 30, 37, 44].map((height, i) => (
          <rect
            key={i}
            x={88 + i * 20}
            y={152 - height}
            width="14"
            height={height}
            rx="2"
            fill="#c8f135"
            opacity={0.55 + i * 0.06}
          />
        ))}
        <rect x="274" y="94" width="138" height="66" rx="5" fill="#162033" />
        {[103, 122, 133, 144].map((y) => (
          <rect key={y} x="282" y={y} width="60" height="5" rx="2.5" fill="#1e2d4a" />
        ))}
        <rect x="282" y="116" width="122" height="1" fill="#1e2d4a" />
      </svg>
      <div className="project-thumb-accent" />
    </div>
  );
}

function Modal({
  children,
  isOpen,
  onClose,
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="modal-box"
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type PortfolioClientProps = {
  initialSection?: SectionId;
  initialPosts?: Post[];
};

export default function PortfolioClient({ initialSection = "home", initialPosts = [] }: PortfolioClientProps) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const hero = useTypewriter(HERO_SEGMENTS, { speed: 22, startDelay: 350, linePause: 240 });
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [postDraft, setPostDraft] = useState<PostDraft>({
    title: "",
    tag: "",
    content: "",
    contentHtml: "",
    imageUrl: "",
  });
  const postContentRef = useRef<HTMLTextAreaElement>(null);
  const [postStatus, setPostStatus] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [contactStatus, setContactStatus] = useState("");
  const [contactStatusType, setContactStatusType] = useState<"ok" | "warn" | "err">("ok");
  const [lastSentAt, setLastSentAt] = useState(0);
  const [contactDraft, setContactDraft] = useState<ContactDraft>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [adminDraft, setAdminDraft] = useState({ email: "", password: "" });
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const db = useMemo(() => {
    try {
      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      return getFirestore(app);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      let current: SectionId = "home";
      navItems.forEach(([id]) => {
        const section = document.getElementById(id);
        if (section && window.scrollY >= section.offsetTop - 220) {
          current = id;
        }
      });
      setActiveSection(current);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (initialSection === "home") return;

    requestAnimationFrame(() => {
      document.getElementById(initialSection)?.scrollIntoView({ block: "start" });
    });
  }, [initialSection]);

  useEffect(() => {
    const localPosts = getLocalPosts();
    if (localPosts.length) {
      queueMicrotask(() => setPosts(localPosts));
    }

    if (!db) {
      queueMicrotask(() => setIsAdmin(true));
      return;
    }

    const appAuth = getAuth();
    queueMicrotask(() => setAuth(appAuth));

    const unsub = onAuthStateChanged(appAuth, (user) => {
      setIsAdmin(Boolean(user));
    });

    const loadPosts = async () => {
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const loadedPosts = snap.docs.map((entry) => {
          const data = entry.data() as {
            title?: string;
            tag?: string;
            content?: string;
            contentHtml?: string;
            imageUrl?: string;
            createdAt?: { toDate?: () => Date };
          };

          return {
            id: entry.id,
            title: data.title ?? "",
            tag: data.tag ?? "Post",
            content: data.content ?? "",
            contentHtml: data.contentHtml ?? "",
            imageUrl: data.imageUrl ?? "",
            date:
              data.createdAt?.toDate?.().toLocaleDateString("en-CA", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }) ?? "Draft",
          };
        });

        setPosts(loadedPosts);
        setFirebaseReady(true);
      } catch {
        setIsAdmin(true);
        setFirebaseReady(false);
      }
    };

    void loadPosts();
    return () => unsub();
  }, [db]);

  const resetPostDraft = () => {
    setEditingId(null);
    setPostDraft({ title: "", tag: "", content: "", contentHtml: "", imageUrl: "" });
    setPostStatus("");
  };

  const refreshFirebasePosts = async () => {
    if (!db) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setPosts(
      snap.docs.map((entry) => {
        const data = entry.data() as {
          title?: string;
          tag?: string;
          content?: string;
          contentHtml?: string;
          imageUrl?: string;
          createdAt?: { toDate?: () => Date };
        };

        return {
          id: entry.id,
          title: data.title ?? "",
          tag: data.tag ?? "Post",
          content: data.content ?? "",
          contentHtml: data.contentHtml ?? "",
          imageUrl: data.imageUrl ?? "",
          date:
            data.createdAt?.toDate?.().toLocaleDateString("en-CA", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }) ?? "Draft",
        };
      }),
    );
  };

  const handlePublish = async (event: FormEvent) => {
    event.preventDefault();
    const title = postDraft.title.trim();
    const tag = postDraft.tag.trim();
    const content = postDraft.content.trim();
    const contentHtml = sanitizePostHtml(postDraft.contentHtml);
    const imageUrl = postDraft.imageUrl.trim();

    if (!title || !content) {
      setPostStatus("Title and content are required.");
      return;
    }

    if (!isValidImageSrc(imageUrl)) {
      setPostStatus("Use a full image URL or a local path starting with /.");
      return;
    }

    try {
      if (firebaseReady && db) {
        if (editingId) {
          setPostStatus("Updating...");
          await updateDoc(doc(db, "posts", editingId), {
            title,
            tag,
            content,
            contentHtml,
            imageUrl,
          });
          setPostStatus("Post updated.");
        } else {
          setPostStatus("Publishing...");
          await addDoc(collection(db, "posts"), {
            title,
            tag,
            content,
            contentHtml,
            imageUrl,
            createdAt: serverTimestamp(),
          });
          setPostStatus("Post published.");
        }
        await refreshFirebasePosts();
      } else {
        let nextPosts: Post[];
        if (editingId) {
          nextPosts = posts.map((post) =>
            post.id === editingId ? { ...post, title, tag, content, contentHtml, imageUrl } : post,
          );
          setPostStatus("Post updated locally.");
        } else {
          nextPosts = [
            {
              id: Date.now().toString(36) + Math.random().toString(36).slice(2),
              title,
              tag,
              content,
              contentHtml,
              imageUrl,
              date: new Date().toLocaleDateString("en-CA", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
            },
            ...posts,
          ];
          setPostStatus("Post saved locally.");
        }
        saveLocalPosts(nextPosts);
        setPosts(nextPosts);
      }

      setTimeout(() => {
        setWriteOpen(false);
        resetPostDraft();
      }, 900);
    } catch (error) {
      setPostStatus(error instanceof Error ? error.message : "Unable to save post.");
    }
  };

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPostStatus("Choose an image file for the cover.");
      event.target.value = "";
      return;
    }

    try {
      const imageUrl = await readFileAsDataUrl(file);
      setPostDraft((draft) => ({ ...draft, imageUrl }));
      setPostStatus(`Cover loaded: ${file.name}`);
    } catch {
      setPostStatus("Unable to read that cover image.");
    } finally {
      event.target.value = "";
    }
  };

  const handleWordUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isDocx =
      file.name.toLowerCase().endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!isDocx) {
      setPostStatus("Choose a .docx Word file.");
      event.target.value = "";
      return;
    }

    try {
      setPostStatus("Importing Word document...");
      const result = await importWordFile(file);
      const contentHtml = result.html;
      const text = result.text;

      if (!contentHtml || !text) {
        setPostStatus("That Word file did not contain readable blog content.");
        return;
      }

      if (postContentRef.current) {
        postContentRef.current.value = text;
      }
      setPostDraft((draft) => ({ ...draft, content: text, contentHtml }));
      setPostStatus(
        result.warnings.length
          ? `Word document imported from ${result.source} content. Review the formatting before publishing.`
          : `Word document imported from ${result.source} content.`,
      );
    } catch (error) {
      setPostStatus(error instanceof Error ? error.message : "Unable to import that Word file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!isAdmin) return;
    const confirmed = window.confirm("Delete this post? This cannot be undone.");
    if (!confirmed) return;

    try {
      if (firebaseReady && db) {
        await deleteDoc(doc(db, "posts", id));
        await refreshFirebasePosts();
      } else {
        const nextPosts = posts.filter((post) => post.id !== id);
        saveLocalPosts(nextPosts);
        setPosts(nextPosts);
      }
    } catch (error) {
      setPostStatus(error instanceof Error ? error.message : "Unable to delete post.");
    }
  };

  const handleAdminLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth) {
      setAdminStatus("Firebase auth is unavailable.");
      return;
    }
    if (!adminDraft.email || !adminDraft.password) {
      setAdminStatus("Email and password are required.");
      return;
    }

    try {
      setAdminStatus("Logging in...");
      await signInWithEmailAndPassword(auth, adminDraft.email, adminDraft.password);
      setAdminOpen(false);
      setAdminDraft({ email: "", password: "" });
      setAdminStatus("");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Unable to log in.");
    }
  };

  const handleAskAi = async (event: FormEvent) => {
    event.preventDefault();
    const question = aiQuestion.trim();
    if (!question || aiLoading) return;

    setAiLoading(true);
    setAiError("");
    setAiAnswer("");

    try {
      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) {
        setAiError(data.error || "Something went wrong. Try again.");
      } else {
        setAiAnswer(data.answer);
      }
    } catch {
      setAiError("Network error. Check your connection and try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleContactSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const { name, email, subject, message } = contactDraft;

    if (!name.trim() || !email.trim() || !message.trim()) {
      setContactStatusType("warn");
      setContactStatus("Please fill in your name, email, and message.");
      return;
    }

    const now = Date.now();
    if (now - lastSentAt < 30000) {
      setContactStatusType("warn");
      setContactStatus("Please wait 30 seconds before sending again.");
      return;
    }

    try {
      setContactStatusType("ok");
      setContactStatus("Sending...");
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: name,
          from_email: email,
          subject: subject || "Portfolio Contact",
          message,
        },
        { publicKey: EMAILJS_PUBLIC_KEY },
      );

      setLastSentAt(Date.now());
      setContactDraft({ name: "", email: "", subject: "", message: "" });
      setContactStatus("Message sent. I will get back to you soon.");
    } catch {
      setContactStatusType("err");
      setContactStatus("Failed to send. Please email me directly.");
    }
  };

  const shareUrl = "https://nwodor.xyz/blog";
  const selectedPostShareText = selectedPost
    ? encodeURIComponent(`Read "${selectedPost.title}" on Success's portfolio`)
    : "";

  return (
    <>
      <BottomNav active={activeSection} />

      <main>
        <section id="home">
          <div className="hero-orbit" />
          <div className="hero-grid">
            <Reveal>
              <p className="greeting" aria-label={HERO_GREETING}>
                {hero.rendered[0]}
                {hero.activeIndex === 0 ? <span className="type-caret" aria-hidden="true" /> : null}
              </p>
              <h1 className="hero-name" aria-label={`${HERO_NAME_1} ${HERO_NAME_2}`}>
                {hero.rendered[1]}
                {hero.activeIndex === 1 ? <span className="type-caret" aria-hidden="true" /> : null}
                {hero.rendered[1] === HERO_NAME_1 ? <br /> : null}
                {hero.rendered[2]}
                {hero.activeIndex === 2 ? <span className="type-caret" aria-hidden="true" /> : null}
              </h1>
              <p className="hero-title" aria-label={HERO_TITLE}>
                {hero.rendered[3]}
                {hero.activeIndex === 3 ? <span className="type-caret" aria-hidden="true" /> : null}
              </p>
              <p className="hero-desc" aria-label={HERO_DESC}>
                {hero.rendered[4]}
                {hero.activeIndex === 4 ? <span className="type-caret" aria-hidden="true" /> : null}
              </p>
              <div className={`button-row hero-reveal ${hero.done ? "show" : ""}`}>
                <a href="/work" className="btn-lime">
                  View My Work <ArrowDown size={16} />
                </a>
                <a href="/contact" className="btn-outline">
                  Let&apos;s Talk <Send size={15} />
                </a>
              </div>

              <form className={`ask-ai hero-reveal ${hero.done ? "show" : ""}`} onSubmit={handleAskAi}>
                <label className="ask-ai-label" htmlFor="ask-ai-input">
                  <Sparkles size={12} /> What would you like to know?
                </label>
                <div className="ask-ai-row">
                  <input
                    id="ask-ai-input"
                    type="text"
                    className="ask-ai-input"
                    placeholder="e.g. What's Success's tech stack?"
                    value={aiQuestion}
                    onChange={(event) => setAiQuestion(event.target.value)}
                    maxLength={300}
                    disabled={aiLoading}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="ask-ai-btn"
                    disabled={aiLoading || !aiQuestion.trim()}
                    aria-label="Ask AI"
                  >
                    {aiLoading ? (
                      <span className="ask-ai-spinner" aria-hidden="true" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </div>
                {aiAnswer ? (
                  <motion.div
                    className="ask-ai-answer"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {aiAnswer}
                  </motion.div>
                ) : null}
                {aiError ? <div className="ask-ai-error">{aiError}</div> : null}
              </form>
            </Reveal>

            <Reveal className="photo-wrap" delay={0.12}>
              <motion.div
                className="photo-circle"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src="/img/profile.jpg"
                  alt="Success Nwodor-Joseph"
                  width={300}
                  height={300}
                  priority
                />
              </motion.div>
              <div className="stats-col">
                {[
                  ["2+", "Years Exp"],
                  ["6+", "Projects"],
                  ["3rd", "Year IT"],
                ].map(([num, label]) => (
                  <motion.div
                    className="stat-card"
                    key={label}
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <div className="stat-num">{num}</div>
                    <div className="stat-label">{label}</div>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section id="about">
          <div className="about-grid">
            <Reveal>
              <SectionTitle
                tag="// 01. About Me"
                title="The Short"
                accent="Version"
              />
              <p className="section-desc spacious">
                I work as an IT administrator, software developer, and data analyst. The throughline
                is a ship-it mindset: I care more about getting something useful in front of a real
                person than about a perfect plan on paper.
              </p>
              <div>
                {strengths.map((item) => (
                  <div className="skill-item" key={item}>
                    {item}
                  </div>
                ))}
              </div>
              <div className="button-row roomy">
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=successofficiall@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-lime"
                >
                  Email Me <FaEnvelope size={15} />
                </a>
                <a
                  href="https://github.com/nwodor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                >
                  GitHub <FaGithub size={15} />
                </a>
              </div>
            </Reveal>

            <Reveal className="about-cards" delay={0.08}>
              {aboutCards.map(({ title, text, Icon }) => (
                <motion.div
                  className="about-card"
                  key={title}
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 240, damping: 22 }}
                >
                  <div className="about-card-icon">
                    <Icon />
                  </div>
                  <h4>{title}</h4>
                  <p>{text}</p>
                </motion.div>
              ))}
            </Reveal>
          </div>
        </section>

        <div className="stack-carousel" aria-label="Technology stack carousel">
          <Marquee
            autoFill
            direction="left"
            gradient
            gradientColor="#0a0a0a"
            gradientWidth={90}
            pauseOnHover
            speed={42}
          >
            {techStack.map(({ name, Icon, featured }) => (
              <div className={`stack-chip ${featured ? "featured" : ""}`} key={name}>
                <Icon className="stack-icon" />
                <span>{name}</span>
              </div>
            ))}
          </Marquee>
        </div>

        <section id="services">
          <Reveal className="section-head-row">
            <div>
              <SectionTitle tag="// 02. What I Do" title="Core" accent="Services" />
            </div>
            <p className="section-desc">What I build, from the database up to the interface.</p>
          </Reveal>

          <div className="services-grid">
            {services.map((service, index) => (
              <Reveal key={service.title} delay={index * 0.06}>
                <motion.div
                  className="service-card"
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 240, damping: 22 }}
                >
                  <div className="service-topline">
                    <div className="service-num">{service.num}</div>
                    <service.Icon className="service-icon" />
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                  <div className="service-tags">
                    {service.tags.map((tag) => (
                      <span className="stag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="experience">
          <Reveal>
            <SectionTitle tag="// 03. My Resume" title="Where I've" accent="Worked" />
          </Reveal>

          <div className="exp-layout">
            <Reveal delay={0.06}>
              <p className="column-kicker">Work Experience</p>
              {workExperience.map((item) => (
                <div className="exp-item" key={item.role}>
                  <div className="exp-date">{item.date}</div>
                  <div className="exp-role">{item.role}</div>
                  <div className="exp-company">{item.company}</div>
                  <div className="exp-desc">{item.desc}</div>
                </div>
              ))}
            </Reveal>

            <Reveal delay={0.12}>
              <p className="column-kicker">Education</p>
              {education.map((item) => (
                <div className="exp-item" key={item.role}>
                  <div className="exp-date">{item.date}</div>
                  <div className="exp-role">{item.role}</div>
                  <div className="exp-company">{item.company}</div>
                  <div className="exp-desc">{item.desc}</div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        <section id="portfolio">
          <Reveal>
            <SectionTitle tag="// 04. My Work" title="Featured" accent="Projects" />
          </Reveal>

          <div className="projects-grid">
            {[
              {
                title: "Car Rental Website",
                status: "Live on Render",
                type: "cars" as const,
                text: "A full-stack car rental site: customers search and book vehicles, while rental companies list cars, manage bookings, and take payments from an admin dashboard.",
                tags: ["Python", "Django", "MySQL", "Bootstrap", "REST APIs", "Render"],
              },
              {
                title: "Finsite",
                status: "In Development",
                type: "finance" as const,
                wip: true,
                text: "A personal finance app for tracking income, expenses, and savings goals, with live charts, transaction history, and budgets.",
                tags: ["PHP", "MySQL", "Data Integrity", "Financial Analytics", "In Progress"],
              },
            ].map((project, index) => (
              <Reveal key={project.title} delay={index * 0.08}>
                <motion.article
                  className="project-card"
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 220, damping: 22 }}
                >
                  <ProjectThumb type={project.type} />
                  <div className="project-body">
                    <div className={`project-status ${project.wip ? "wip" : ""}`}>
                      <span className="status-dot-sm" /> {project.status}
                    </div>
                    <h3>{project.title}</h3>
                    <p>{project.text}</p>
                    <div className="tech-list">
                      {project.tags.map((tag) => (
                        <span className="tech-pill" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="skills">
          <Reveal className="blog-header">
            <div>
              <SectionTitle tag="// 05. Blog" title="Thoughts &" accent="Articles" />
            </div>
            <div className="blog-actions">
              {isAdmin ? (
                <>
                  <button
                    className="btn-lime"
                    type="button"
                    onClick={() => {
                      resetPostDraft();
                      setWriteOpen(true);
                    }}
                  >
                    Write Post <FaPenNib size={15} />
                  </button>
                  <button
                    className="btn-outline"
                    type="button"
                    onClick={() => auth && void signOut(auth)}
                  >
                    Logout <LogOut size={15} />
                  </button>
                </>
              ) : null}
            </div>
          </Reveal>

          <div className="blog-grid">
            {posts.length ? (
              posts.map((post, index) => (
                <Reveal key={post.id} delay={index * 0.04}>
                  <motion.article
                    className="blog-card"
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 240, damping: 22 }}
                    onClick={() => setSelectedPost(post)}
                  >
                    <div className="blog-card-img has-image">
                      <Image
                        src={getPostImageSrc(post)}
                        alt={post.title}
                        fill
                        sizes="(max-width: 900px) 100vw, 33vw"
                        className="blog-card-photo"
                      />
                      <span>{post.tag || "Blog"}</span>
                    </div>
                    <div className="blog-card-body">
                      <div className="blog-tag">{post.tag || "Post"}</div>
                      <h3>{post.title}</h3>
                      <p>
                        {getPostPreview(post).slice(0, 100)}
                        {getPostPreview(post).length > 100 ? "..." : ""}
                      </p>
                      <div className="blog-date">{post.date}</div>
                      {isAdmin ? (
                        <div className="blog-card-actions" onClick={(event) => event.stopPropagation()}>
                          <button
                            className="blog-action-btn"
                            type="button"
                            onClick={() => {
                              setEditingId(post.id);
                              setPostDraft({
                                title: post.title,
                                tag: post.tag,
                                content: post.content,
                                contentHtml: post.contentHtml ?? "",
                                imageUrl: post.imageUrl ?? "",
                              });
                              setWriteOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="blog-action-btn delete"
                            type="button"
                            onClick={() => void handleDeletePost(post.id)}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </motion.article>
                </Reveal>
              ))
            ) : (
              <div className="empty-state">No posts yet. Coming soon.</div>
            )}
          </div>
        </section>

        <section id="contact">
          <Reveal>
            <SectionTitle tag="// 06. Get In Touch" title="Let's Work" accent="Together" />
          </Reveal>

          <div className="contact-grid">
            <Reveal delay={0.06}>
              <p className="contact-lead">
                I&apos;m job hunting in the Canadian tech market: AI engineering, full-stack, and
                data roles in Edmonton, Calgary, or remote. Also open to freelance work.
              </p>
              <ul className="contact-list">
                <li className="skill-item">2+ years shipping software</li>
                <li className="skill-item">Full-stack web development</li>
                <li className="skill-item">REST API design & integration</li>
                <li className="skill-item">Databases & data analysis</li>
              </ul>
              <div className="contact-info">
                <a href="mailto:successofficiall@gmail.com" className="contact-info-item">
                  <FaEnvelope className="contact-icon" size={18} />
                  <span>successofficiall@gmail.com</span>
                </a>
                <a
                  href="https://github.com/nwodor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-info-item"
                >
                  <FaGithub className="contact-icon" size={18} />
                  <span>github.com/nwodor</span>
                </a>
                <div className="contact-info-item">
                  <FaMapMarkerAlt className="contact-icon" size={18} />
                  <span>Edmonton, AB, Canada</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <form className="contact-form" onSubmit={handleContactSubmit}>
                <div className="form-group">
                  <label htmlFor="cf-name">Full Name</label>
                  <input
                    type="text"
                    id="cf-name"
                    placeholder="Nwodor Success"
                    value={contactDraft.name}
                    onChange={(event) =>
                      setContactDraft((draft) => ({ ...draft, name: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cf-email">Email Address</label>
                  <input
                    type="email"
                    id="cf-email"
                    placeholder="Success@example.com"
                    value={contactDraft.email}
                    onChange={(event) =>
                      setContactDraft((draft) => ({ ...draft, email: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cf-subject">Subject</label>
                  <input
                    type="text"
                    id="cf-subject"
                    placeholder="Project Inquiry"
                    value={contactDraft.subject}
                    onChange={(event) =>
                      setContactDraft((draft) => ({ ...draft, subject: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cf-message">Message</label>
                  <textarea
                    id="cf-message"
                    placeholder="Tell me about your project..."
                    value={contactDraft.message}
                    onChange={(event) =>
                      setContactDraft((draft) => ({ ...draft, message: event.target.value }))
                    }
                  />
                </div>
                <button className="btn-lime full-width" type="submit">
                  Send Message <Send size={15} />
                </button>
                {contactStatus ? (
                  <p className={`form-status ${contactStatusType}`}>{contactStatus}</p>
                ) : null}
              </form>
            </Reveal>
          </div>
        </section>
      </main>

      <footer>
        <p>
          &copy; 2026 <span className="footer-lime">Nwodor-Joseph Success</span>
        </p>
        <p>Edmonton, AB, Canada</p>
      </footer>

      <Modal isOpen={Boolean(selectedPost)} onClose={() => setSelectedPost(null)}>
        {selectedPost ? (
          <>
            <div className="modal-header">
              <button className="modal-close" type="button" onClick={() => setSelectedPost(null)}>
                <X size={18} />
              </button>
              <p className="blog-tag">{selectedPost.tag || "Post"}</p>
              <h2>{selectedPost.title}</h2>
              <p className="modal-date">{selectedPost.date}</p>
            </div>
            <div className="modal-body">
              <div className="modal-post-image">
                <Image
                  src={getPostImageSrc(selectedPost)}
                  alt={selectedPost.title}
                  fill
                  sizes="(max-width: 720px) 100vw, 680px"
                  className="modal-post-photo"
                />
              </div>
              {selectedPost.contentHtml ? (
                <div
                  className="modal-content rich-post-content"
                  dangerouslySetInnerHTML={{ __html: sanitizePostHtml(selectedPost.contentHtml) }}
                />
              ) : (
                <p className="modal-content">{selectedPost.content}</p>
              )}
              <div className="share-bar">
                <span className="share-label">Share</span>
                <a
                  className="share-btn"
                  href={`https://twitter.com/intent/tweet?text=${selectedPostShareText}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  X <ArrowUpRight size={13} />
                </a>
                <a
                  className="share-btn"
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaLinkedinIn size={13} /> in
                </a>
                <a
                  className="share-btn"
                  href={`https://wa.me/?text=${selectedPostShareText}%20${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaWhatsapp size={13} /> WA
                </a>
                <button
                  className="share-btn"
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(shareUrl)}
                >
                  <FaCopy size={13} /> Copy
                </button>
              </div>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        isOpen={writeOpen}
        onClose={() => {
          setWriteOpen(false);
          resetPostDraft();
        }}
      >
        <div className="modal-header">
          <button
            className="modal-close"
            type="button"
            onClick={() => {
              setWriteOpen(false);
              resetPostDraft();
            }}
          >
            <X size={18} />
          </button>
          <h2>{editingId ? "Edit Post" : "Write New Post"}</h2>
        </div>
        <form className="modal-body" onSubmit={handlePublish}>
          <div className="form-group">
            <label htmlFor="post-title">Post Title</label>
            <input
              type="text"
              id="post-title"
              placeholder="e.g. What's on your mind?"
              value={postDraft.title}
              onChange={(event) =>
                setPostDraft((draft) => ({ ...draft, title: event.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="post-tag">Tag / Category</label>
            <input
              type="text"
              id="post-tag"
              placeholder="e.g. Tech, Career"
              value={postDraft.tag}
              onChange={(event) =>
                setPostDraft((draft) => ({ ...draft, tag: event.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="post-image">Image URL</label>
            <input
              type="text"
              id="post-image"
              placeholder="Leave blank to use /img/article-workspace.jpg"
              value={postDraft.imageUrl}
              onChange={(event) =>
                setPostDraft((draft) => ({ ...draft, imageUrl: event.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="post-cover-file">Cover Image</label>
            <input id="post-cover-file" type="file" accept="image/*" onChange={handleCoverUpload} />
            {postDraft.imageUrl.startsWith("data:image/") ? (
              <div className="blog-cover-preview">
                <Image
                  src={postDraft.imageUrl}
                  alt="Selected blog cover preview"
                  fill
                  sizes="160px"
                  className="blog-cover-preview-img"
                />
              </div>
            ) : null}
          </div>
          <div className="form-group">
            <label htmlFor="post-word-file">Word Document</label>
            <input
              id="post-word-file"
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleWordUpload}
            />
          </div>
          <div className="form-group">
            <label htmlFor="post-content">Content</label>
            <textarea
              id="post-content"
              ref={postContentRef}
              className="tall-textarea"
              placeholder="Write your post here..."
              value={postDraft.content}
              onChange={(event) =>
                setPostDraft((draft) => ({
                  ...draft,
                  content: event.target.value,
                  contentHtml: "",
                }))
              }
            />
          </div>
          {postDraft.contentHtml ? (
            <div className="word-import-content">
              <div className="word-import-content-header">
                <span>Imported Word Content</span>
                <span>{getTextScore(postDraft.content).toLocaleString()} characters</span>
              </div>
              <div
                className="word-import-preview rich-post-content"
                dangerouslySetInnerHTML={{ __html: sanitizePostHtml(postDraft.contentHtml) }}
              />
            </div>
          ) : null}
          <button className="btn-lime full-width" type="submit">
            {editingId ? "Update Post" : "Publish Post"} <Send size={15} />
          </button>
          {postStatus ? <p className="form-status ok">{postStatus}</p> : null}
        </form>
      </Modal>

      <Modal isOpen={adminOpen} onClose={() => setAdminOpen(false)}>
        <div className="modal-header">
          <button className="modal-close" type="button" onClick={() => setAdminOpen(false)}>
            <X size={18} />
          </button>
          <h2>Admin Access</h2>
        </div>
        <form className="modal-body" onSubmit={handleAdminLogin}>
          <div className="form-group">
            <label htmlFor="admin-email">Email</label>
            <input
              type="email"
              id="admin-email"
              placeholder="your@email.com"
              value={adminDraft.email}
              onChange={(event) =>
                setAdminDraft((draft) => ({ ...draft, email: event.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <input
              type="password"
              id="admin-password"
              placeholder="Password"
              value={adminDraft.password}
              onChange={(event) =>
                setAdminDraft((draft) => ({ ...draft, password: event.target.value }))
              }
            />
          </div>
          <button className="btn-lime full-width" type="submit">
            Login <FaLock size={15} />
          </button>
          {adminStatus ? <p className="form-status err">{adminStatus}</p> : null}
        </form>
      </Modal>

      <button
        id="admin-trigger"
        type="button"
        aria-label="Admin"
        onClick={() => setAdminOpen(true)}
      />
    </>
  );
}
