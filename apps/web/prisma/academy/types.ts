export interface LibLesson { title: string; durationMin: number; content: string; isPreview?: boolean; quiz?: { q: string; options: string[]; answer: number }[] }
export interface LibCourse {
  slug: string; title: string; summary: string; description: string; category: string; level: "Beginner" | "Intermediate" | "Advanced";
  priceCents: number; compareAtCents?: number; coverColor: string; outcomes: string[]; audience: string; tags: string[]; featured?: boolean; lessons: LibLesson[];
}
