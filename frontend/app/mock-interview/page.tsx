"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Bot, ChevronRight, Loader2, RotateCcw, Trophy } from "lucide-react";

type Question = {
  id: number;
  text: string;
  topic: string;
};

type Answer = {
  questionId: number;
  questionText: string;
  answerText: string;
  score: number;
  feedback: string;
  topic: string;
};

type CourseRecommendation = {
  title: string;
  platform: string;
  url: string;
  reason: string;
};

type MockReport = {
  overallScore: number;
  summary: string;
  weakPoints: string[];
  strongPoints: string[];
  courseRecommendations: CourseRecommendation[];
};

type Stage = "loading" | "questions" | "answering" | "evaluating" | "report";

function MockInterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hydrated } = useAuthStore();

  const domain = searchParams.get("domain") || "Software Engineering";
  const level = searchParams.get("level") || "junior";
  const questionCount = parseInt(searchParams.get("questions") || "5");

  const [stage, setStage] = useState<Stage>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [report, setReport] = useState<MockReport | null>(null);
  const [error, setError] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push("/login");
      return;
    }
    generateQuestions();
  }, [hydrated]);

  const callGroq = async (prompt: string): Promise<string> => {
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      }
    );
    const data = await response.json();
    console.log("Groq response:", JSON.stringify(data).substring(0, 200));
    const text = data.choices?.[0]?.message?.content || "";
    if (!text) throw new Error("Empty response from Groq: " + JSON.stringify(data));
    return text;
  };

  const generateQuestions = async () => {
    setStage("loading");
    setError("");
    try {
      const prompt = `Generate exactly ${questionCount} interview questions for a ${level} ${domain} developer position.
Return ONLY a JSON array, no markdown, no explanation:
[{"id":1,"text":"question here","topic":"topic name"},...]
Make questions practical and relevant to ${domain} at ${level} level.`;

      const raw = await callGroq(prompt);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setQuestions(parsed);
      setStage("questions");
    } catch (err) {
      setError("Failed to generate questions. Please try again.");
      setStage("loading");
    }
  };

  const startInterview = () => {
    setStage("answering");
    setCurrentIndex(0);
    setCurrentAnswer("");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) return;
    setIsThinking(true);
    setStage("evaluating");

    try {
      const q = questions[currentIndex];
      const prompt = `You are an expert ${domain} interviewer.
Question: "${q.text}"
Candidate answer: "${currentAnswer}"
Level expected: ${level}

Return ONLY JSON, no markdown:
{"score":85,"feedback":"2-3 sentence feedback here"}
Score 0-100 based on correctness, depth, and clarity for ${level} level.`;

      const raw = await callGroq(prompt);
      const clean = raw.replace(/```json|```/g, "").trim();
      const evaluation = JSON.parse(clean);

      const newAnswer: Answer = {
        questionId: q.id,
        questionText: q.text,
        answerText: currentAnswer,
        score: evaluation.score,
        feedback: evaluation.feedback,
        topic: q.topic,
      };

      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);
      setCurrentAnswer("");

      if (currentIndex + 1 >= questions.length) {
        await generateReport(updatedAnswers);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setStage("answering");
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    } catch (err) {
      setError("Failed to evaluate answer. Please try again.");
      setStage("answering");
    } finally {
      setIsThinking(false);
    }
  };

  const generateReport = async (allAnswers: Answer[]) => {
    setStage("loading");
    try {
      const avgScore = Math.round(allAnswers.reduce((s, a) => s + a.score, 0) / allAnswers.length);
      const answerSummary = allAnswers
        .map(
          (a) =>
            `Q: ${a.questionText}\nA: ${a.answerText}\nScore: ${a.score}/100\nFeedback: ${a.feedback}`
        )
        .join("\n\n");

      const prompt = `Based on this ${level} ${domain} mock interview, generate a report.

${answerSummary}

For courseRecommendations, use YouTube search URLs in the format https://www.youtube.com/results?search_query=TOPIC+tutorial, or link to stable platform homepages like https://www.freecodecamp.org or https://developer.mozilla.org. Do NOT generate specific Udemy or Coursera course URLs since they cannot be verified and often 404.

Return ONLY JSON, no markdown:
{
  "overallScore": ${avgScore},
  "summary": "2-3 sentence overall assessment",
  "weakPoints": ["weak point 1", "weak point 2", "weak point 3"],
  "strongPoints": ["strong point 1", "strong point 2"],
  "courseRecommendations": [
    {"title":"Course Name","platform":"YouTube","url":"https://www.youtube.com/results?search_query=COURSE+TOPIC","reason":"why this helps"},
    {"title":"Course Name","platform":"freeCodeCamp","url":"https://www.freecodecamp.org/news/","reason":"why this helps"},
    {"title":"Course Name","platform":"MDN Web Docs","url":"https://developer.mozilla.org/en-US/","reason":"why this helps"}
  ]
}`;

      const raw = await callGroq(prompt);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setReport(parsed);
      setStage("report");
    } catch (err) {
      setError("Failed to generate report.");
      setStage("answering");
    }
  };

  const scoreColor = (score: number) =>
    score >= 70 ? "text-green-500" : score >= 40 ? "text-yellow-500" : "text-red-500";

  const scoreBg = (score: number) =>
    score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Mock Interview</h1>
              <p className="text-sm text-muted-foreground">
                {domain} • {level} • {questionCount} questions
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/candidate")}>
            Exit
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
            <Button size="sm" variant="outline" onClick={generateQuestions} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {stage === "loading" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">AI is preparing your interview...</p>
            </CardContent>
          </Card>
        )}

        {stage === "questions" && (
          <Card>
            <CardHeader>
              <CardTitle>Ready to Start?</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your {questionCount} questions are ready. Take your time with each answer.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <Badge variant="outline" className="mb-1 text-xs">
                      {q.topic}
                    </Badge>
                    <p className="text-sm">{q.text}</p>
                  </div>
                </div>
              ))}
              <Button className="w-full" onClick={startInterview}>
                Start Interview <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {(stage === "answering" || stage === "evaluating") && questions[currentIndex] && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{questions[currentIndex].topic}</Badge>
                <span className="text-sm text-muted-foreground">
                  Question {currentIndex + 1} of {questions.length}
                </span>
              </div>
              <CardTitle className="mt-2 text-lg">{questions[currentIndex].text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="w-full overflow-hidden rounded-lg bg-muted/20">
                <div
                  className="h-1 bg-primary transition-all"
                  style={{ width: `${(currentIndex / questions.length) * 100}%` }}
                />
              </div>
              <textarea
                ref={textareaRef}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="min-h-[150px] w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                disabled={stage === "evaluating"}
              />
              {answers.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Previous answer feedback:</p>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`text-sm font-bold ${scoreColor(answers[answers.length - 1].score)}`}>
                      {answers[answers.length - 1].score}/100
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{answers[answers.length - 1].feedback}</p>
                </div>
              )}
              <Button
                className="w-full"
                onClick={submitAnswer}
                disabled={!currentAnswer.trim() || stage === "evaluating"}
              >
                {stage === "evaluating" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI is evaluating...
                  </>
                ) : currentIndex + 1 >= questions.length ? (
                  <>Submit Final Answer</>
                ) : (
                  <>
                    Submit Answer <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {stage === "report" && report && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <div>
                    <CardTitle>Interview Complete!</CardTitle>
                    <p className="text-sm text-muted-foreground">Here is your performance report</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                  <div
                    className={`flex h-24 w-24 items-center justify-center rounded-full ${scoreBg(report.overallScore)} text-white`}
                  >
                    <span className="text-3xl font-bold">{report.overallScore}</span>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">{report.summary}</p>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-green-600">Strong Points</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.strongPoints.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-green-500">✓</span>
                      {p}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-red-600">Weak Points</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.weakPoints.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-red-500">✗</span>
                      {p}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Answer Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {answers.map((a, i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Q{i + 1}: {a.questionText}</p>
                      <span className={`text-sm font-bold ${scoreColor(a.score)}`}>{a.score}/100</span>
                    </div>
                    <p className="rounded bg-muted/30 p-2 text-xs text-muted-foreground">{a.answerText}</p>
                    <p className="text-xs text-muted-foreground">{a.feedback}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommended Courses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.courseRecommendations.map((c, i) => (
                  <div key={i} className="space-y-1 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{c.title}</p>
                      <Badge variant="outline">{c.platform}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.reason}</p>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View Course →
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setAnswers([]);
                  setCurrentIndex(0);
                  setCurrentAnswer("");
                  setReport(null);
                  generateQuestions();
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button className="flex-1" onClick={() => router.push("/dashboard/candidate")}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MockInterviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading interview...</p>
        </div>
      </div>
    }>
      <MockInterviewContent />
    </Suspense>
  );
}
