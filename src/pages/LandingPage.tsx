import {
  Bot,
  GitBranch,
  Lightbulb,
  Share2,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import heroImage from "@/assets/hero.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";

const features = [
  {
    icon: Sparkles,
    title: "Timeline history",
    description:
      "Every journal entry, milestone, todo, and progress change becomes a living project record.",
  },
  {
    icon: GitBranch,
    title: "GitHub changelogs",
    description:
      "Connect a repo and turn commits and releases into readable project updates automatically.",
  },
  {
    icon: Bot,
    title: "AI PM copilot",
    description:
      "Ask for next steps, milestone ideas, and sharper plans using context from the project.",
  },
  {
    icon: Trophy,
    title: "Points & levels",
    description:
      "Earn momentum from todos, milestones, journal entries, commits, and shipped releases.",
  },
  {
    icon: Share2,
    title: "Project sharing",
    description:
      "Publish a read-only progress page for friends, customers, or accountability partners.",
  },
  {
    icon: Lightbulb,
    title: "Parking lot ideas",
    description:
      "Capture feature sparks and turn the best ones into step-by-step implementation paths.",
  },
];

export default function LandingPage() {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      data-testid="landing-page"
      className="min-h-screen bg-background text-foreground"
    >
      <main>
        <section className="mx-auto grid min-h-[88svh] w-full max-w-7xl content-center gap-12 px-5 py-14 md:grid-cols-[1fr_0.92fr] md:px-10 lg:px-14">
          <div className="flex flex-col items-center justify-center text-center md:items-start md:text-left">
            <Badge variant="secondary" className="mb-5">
              Solo-builder project tracking
            </Badge>
            <h1 className="max-w-4xl text-5xl font-semibold leading-none tracking-normal text-foreground md:text-7xl">
              Build more. Track effortlessly. Ship with confidence.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
              GitShipDone turns your project vision, journal updates, todos,
              GitHub activity, and AI guidance into one focused workspace for
              getting solo projects across the line.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/register">Get Started Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-8 rounded-full bg-primary/5 blur-3xl" />
            <img
              src={heroImage}
              alt="GitShipDone project dashboard preview"
              className="relative w-full max-w-xl rounded-lg border bg-card shadow-2xl"
            />
          </div>
        </section>

        <section className="border-t bg-muted/30 px-5 py-16 md:px-10 lg:px-14">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
                A quieter command center for work you actually want to finish.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Built around momentum, reflection, and shipping instead of
                heavyweight team process.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <feature.icon className="mb-2 text-primary" />
                    <CardTitle>
                      <h3>{feature.title}</h3>
                    </CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-1 rounded-full bg-primary/10" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
