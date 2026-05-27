import { TrendingUp, BarChart3, Target, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MockAttempt, InterviewSession } from "@/lib/store";

interface ProgressPageProps {
  mocks: MockAttempt[];
  sessions: InterviewSession[];
}

export default function ProgressPage({
  mocks,
  sessions,
}: ProgressPageProps) {
  // Score over time
  const scoreData = [...mocks]
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
    )
    .map((m, i) => ({
      attempt: i + 1,
      score: m.aiScore * 10,
      date: new Date(m.createdAt).toLocaleDateString(),
    }));

  // Confidence over time
  const confidenceData = [...mocks]
    .filter(
      (m) =>
        m.aiFeedback?.confidenceAnalysis?.confidenceScore !==
          undefined &&
        m.aiFeedback?.confidenceAnalysis?.confidenceScore !== null
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
    )
    .map((m, i) => ({
      attempt: i + 1,
      confidence:
        m.aiFeedback!.confidenceAnalysis!.confidenceScore,
      date: new Date(m.createdAt).toLocaleDateString(),
    }));

  // Average confidence score
  const averageConfidence =
    confidenceData.length > 0
      ? Number(
          (
            confidenceData.reduce(
              (sum, item) => sum + item.confidence,
              0
            ) / confidenceData.length
          ).toFixed(1)
        )
      : null;

  // Questions by type
  const typeCount = {
    behavioral: 0,
    technical: 0,
    situational: 0,
  };

  mocks.forEach((m) => {
    sessions.forEach((s) => {
      const q = s.questionBank.find(
        (qb) => qb.question === m.question
      );

      if (q && q.type in typeCount) {
        typeCount[q.type as keyof typeof typeCount]++;
      }
    });
  });

  const typeData = [
    { type: "Behavioral", count: typeCount.behavioral },
    { type: "Technical", count: typeCount.technical },
    { type: "Situational", count: typeCount.situational },
  ];

  const hasQuestionTypeData = typeData.some(
    (item) => item.count > 0
  );

  // Weak areas
  const weakAreas = [...typeData]
    .filter((area) => area.count > 0)
    .sort((a, b) => a.count - b.count)
    .slice(0, 3);

  // Readiness trend
  const readinessData = sessions.map((s, i) => ({
    session: i + 1,
    score: s.readinessScore,
  }));

  // Activity streak (last 30 days)
  const today = new Date();

  const activeDays = new Set(
    [
      ...mocks.map((m) => m.createdAt),
      ...sessions.map((s) => s.createdAt),
    ].map((d) => new Date(d).toDateString())
  );

  const streakDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);

    d.setDate(d.getDate() - (29 - i));

    return {
      date: d.toDateString(),
      day: d.getDate(),
      active: activeDays.has(d.toDateString()),
    };
  });

  const isEmpty =
    mocks.length === 0 && sessions.length === 0;

  const downloadReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Mock Interview Progress Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.setTextColor(0); // Reset text color to black
    
    const avgScore = mocks.length > 0 ? Math.round(mocks.reduce((sum, m) => sum + m.aiScore, 0) / mocks.length * 10) : 0;
    doc.text(`Total Mock Attempts: ${mocks.length}`, 14, 40);
    doc.text(`Average Score: ${avgScore}/100`, 14, 46);
    if (averageConfidence !== null) {
      doc.text(`Average Confidence: ${averageConfidence}%`, 14, 52);
    }
    
    // Precompute a lookup map for question types
    const questionTypeMap = new Map<string, string>();
    for (const s of sessions) {
      for (const qb of s.questionBank) {
        questionTypeMap.set(qb.question, qb.type.charAt(0).toUpperCase() + qb.type.slice(1));
      }
    }
    
    const tableData = mocks.map((m) => {
      const qType = questionTypeMap.get(m.question) || "Unknown";
      const date = new Date(m.createdAt).toLocaleDateString();
      const score = `${Math.round(m.aiScore * 10)}/100`;
      const feedback = m.aiFeedback?.oneLineVerdict || "No feedback available";
      return [date, qType, score, m.question, feedback];
    });
    
    autoTable(doc, {
      startY: 60,
      head: [["Date", "Type", "Score", "Question", "Feedback"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 15 },
        3: { cellWidth: 60 },
        4: { cellWidth: 'auto' },
      },
    });
    
    doc.save("Interview_Progress_Report.pdf");
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Progress
          </h1>

          <p className="text-sm text-muted-foreground">
            Track your interview preparation journey
          </p>
        </div>
        {!isEmpty && (
          <Button onClick={downloadReport} className="gradient-primary text-primary-foreground">
            <Download className="w-4 h-4 mr-2" /> Download Report
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-card">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />

          <h3 className="text-lg font-semibold text-foreground mb-1">
            No progress data yet
          </h3>

          <p className="text-sm text-muted-foreground">
            Complete prep sessions and mock interviews to
            see your progress here
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Score Over Time */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Mock Scores Over Time
            </h3>

            {scoreData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={scoreData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />

                  <XAxis
                    dataKey="attempt"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />

                  <YAxis
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Score",
                    ]}
                    contentStyle={{
                      backgroundColor:
                        "hsl(var(--card))",
                      border:
                        "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{
                      fill: "hsl(var(--primary))",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No mock interviews yet
              </p>
            )}
          </div>

          {/* Confidence Trend */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Confidence Trend
            </h3>

            {averageConfidence !== null && (
              <p className="text-sm text-muted-foreground mb-4">
                Average Confidence:{" "}
                <span className="font-semibold text-foreground">
                  {averageConfidence}%
                </span>
              </p>
            )}

            {confidenceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={confidenceData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />

                  <XAxis
                    dataKey="attempt"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />

                  <YAxis
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Confidence",
                    ]}
                    contentStyle={{
                      backgroundColor:
                        "hsl(var(--card))",
                      border:
                        "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="confidence"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={{
                      fill: "hsl(var(--success))",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No confidence analysis data available yet
              </p>
            )}
          </div>

          {/* Questions by Type */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Questions by Type
            </h3>

            {hasQuestionTypeData ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />

                  <XAxis
                    dataKey="type"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />

                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor:
                        "hsl(var(--card))",
                      border:
                        "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />

                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Question type data will appear after mock
                interviews use saved session questions
              </p>
            )}
          </div>

          {/* Activity Streak */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Activity (Last 30 Days)
            </h3>

            <div className="grid grid-cols-10 gap-1.5">
              {streakDays.map((d, i) => (
                <div
                  key={i}
                  className={`w-full aspect-square rounded-sm text-[10px] flex items-center justify-center ${
                    d.active
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                  title={d.date}
                >
                  {d.day}
                </div>
              ))}
            </div>
          </div>

          {/* Weak Areas + Readiness */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-warning" />
                Areas to Focus
              </h3>

              <div className="space-y-2">
                {weakAreas.length > 0 ? (
                  weakAreas.map((area) => (
                    <div
                      key={area.type}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                    >
                      <span className="text-sm text-foreground">
                        {area.type}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {area.count} attempted
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Focus areas will appear after your mock
                    interviews are linked to question types
                  </p>
                )}
              </div>
            </div>

            {readinessData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Readiness Trend
                </h3>

                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={readinessData}>
                    <XAxis
                      dataKey="session"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />

                    <YAxis
                      domain={[0, 100]}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />

                    <Tooltip
                      formatter={(value) => [
                        `${value}%`,
                        "Readiness",
                      ]}
                      contentStyle={{
                        backgroundColor:
                          "hsl(var(--card))",
                        border:
                          "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      dot={{
                        fill: "hsl(var(--success))",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}