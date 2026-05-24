import { jsPDF } from "jspdf";
import { MockAttempt, InterviewSession } from "./store";

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

class PDFBuilder {
  doc: jsPDF;
  y: number;
  margin: number;
  bottomLimit: number;
  pageCount: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    this.y = 20;
    this.margin = 15;
    this.bottomLimit = 275;
    this.pageCount = 1;
    this.setupPage();
  }

  private setupPage() {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(150, 150, 150);
  }

  drawHeader() {
    // Primary Blue accent bar
    this.doc.setFillColor(59, 130, 246); // PrepIQ Blue
    this.doc.rect(this.margin, 12, 180, 2, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(18);
    this.doc.setTextColor(31, 41, 55); // Slate 800
    this.doc.text("PrepIQ Progress Report", this.margin, 22);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.setTextColor(107, 114, 128); // Slate 500
    const dateStr = `Generated: ${new Date().toLocaleDateString()}`;
    this.doc.text(dateStr, 195 - this.doc.getTextWidth(dateStr), 22);

    this.y = 28;
    this.doc.setDrawColor(229, 231, 235); // Gray 200
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.y, 195, this.y);
    this.y += 8;
  }

  drawFooter() {
    const pageHeight = this.doc.internal.pageSize.height;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(156, 163, 175); // Gray 400
    this.doc.text(`Page ${this.pageCount}`, this.margin, pageHeight - 10);
    this.doc.text("PrepIQ — AI-Powered Interview Prep Dashboard", 195 - this.doc.getTextWidth("PrepIQ — AI-Powered Interview Prep Dashboard"), pageHeight - 10);
  }

  checkPageBreak(heightNeeded: number) {
    if (this.y + heightNeeded > this.bottomLimit) {
      this.drawFooter();
      this.doc.addPage();
      this.pageCount++;
      this.y = 25;
      this.setupPage();

      // Page header for subsequent pages
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(156, 163, 175);
      this.doc.text("PrepIQ Progress Report (Continued)", this.margin, 12);
      this.doc.setDrawColor(243, 244, 246);
      this.doc.setLineWidth(0.2);
      this.doc.line(this.margin, 14, 195, 14);
      this.y = 22;
    }
  }

  drawStatsDashboard(totalMocks: number, avgScore: number, totalSessions: number) {
    this.checkPageBreak(25);
    const cardWidth = 56;
    const cardHeight = 22;
    const gap = 6;
    const startX = this.margin;

    // Card 1: Prep Sessions
    this.drawCard(startX, this.y, cardWidth, cardHeight, "Prep Sessions", totalSessions.toString(), [59, 130, 246]);

    // Card 2: Mock Attempts
    this.drawCard(startX + cardWidth + gap, this.y, cardWidth, cardHeight, "Mock Attempts", totalMocks.toString(), [168, 85, 247]);

    // Card 3: Avg Score
    this.drawCard(startX + (cardWidth + gap) * 2, this.y, cardWidth, cardHeight, "Average Score", `${avgScore}/10`, [16, 185, 129]);

    this.y += cardHeight + 8;
  }

  private drawCard(x: number, y: number, w: number, h: number, label: string, value: string, color: [number, number, number]) {
    this.doc.setFillColor(249, 250, 251); // Gray 50
    this.doc.setDrawColor(229, 231, 235);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(x, y, w, h, 2, 2, "FD");

    // Color indicator border on the left
    this.doc.setFillColor(color[0], color[1], color[2]);
    this.doc.rect(x, y, 1.5, h, "F");

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(107, 114, 128);
    this.doc.text(label, x + 5, y + 7);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(14);
    this.doc.setTextColor(31, 41, 55);
    this.doc.text(value, x + 5, y + 16);
  }

  printSectionHeader(title: string) {
    this.checkPageBreak(12);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(12);
    this.doc.setTextColor(17, 24, 39); // Gray 900
    this.doc.text(title, this.margin, this.y);
    this.y += 5;

    this.doc.setDrawColor(229, 231, 235);
    this.doc.setLineWidth(0.4);
    this.doc.line(this.margin, this.y, 195, this.y);
    this.y += 6;
  }

  printText(text: string, fontSize: number = 10, isBold: boolean = false, color: [number, number, number] = [55, 65, 81], isItalic: boolean = false) {
    this.doc.setFont("helvetica", isBold ? (isItalic ? "bolditalic" : "bold") : (isItalic ? "italic" : "normal"));
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(color[0], color[1], color[2]);

    const lines = this.doc.splitTextToSize(text, 180);
    const lineHeight = fontSize * 0.45;

    lines.forEach((line: string) => {
      this.checkPageBreak(lineHeight + 1);
      this.doc.text(line, this.margin, this.y);
      this.y += lineHeight + 1;
    });
  }

  printKeyValue(key: string, value: string, fontSize: number = 10, keyColor: [number, number, number] = [107, 114, 128], valueColor: [number, number, number] = [31, 41, 55]) {
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(keyColor[0], keyColor[1], keyColor[2]);
    const keyWidth = this.doc.getTextWidth(key);

    this.checkPageBreak(fontSize * 0.45 + 2);

    this.doc.text(key, this.margin, this.y);

    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);

    const remainingWidth = 180 - keyWidth - 2;
    const valLines = this.doc.splitTextToSize(value, remainingWidth);
    const lineHeight = fontSize * 0.45;

    valLines.forEach((line: string, idx: number) => {
      if (idx > 0) {
        this.checkPageBreak(lineHeight + 1);
      }
      this.doc.text(line, this.margin + keyWidth + 2, this.y);
      if (idx < valLines.length - 1) {
        this.y += lineHeight + 1;
      }
    });

    this.y += lineHeight + 2;
  }

  printBulletPoints(title: string, items: string[], bulletColor: [number, number, number]) {
    if (!items || items.length === 0) return;

    this.checkPageBreak(6);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9);
    this.doc.setTextColor(31, 41, 55);
    this.doc.text(title, this.margin, this.y);
    this.y += 4;

    items.forEach((item) => {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(9);
      this.doc.setTextColor(55, 65, 81);

      // Wrap text for the bullet item
      const lines = this.doc.splitTextToSize(item, 172); // slightly indented
      const lineHeight = 9 * 0.45;

      lines.forEach((line: string, idx: number) => {
        this.checkPageBreak(lineHeight + 1);
        if (idx === 0) {
          // Draw custom bullet circle
          this.doc.setFillColor(bulletColor[0], bulletColor[1], bulletColor[2]);
          this.doc.circle(this.margin + 2, this.y - 1, 0.8, "F");
          this.doc.text(line, this.margin + 6, this.y);
        } else {
          this.doc.text(line, this.margin + 6, this.y);
        }
        this.y += lineHeight + 1.2;
      });
    });
    this.y += 1.5;
  }

  drawHorizontalLine(color: [number, number, number] = [229, 231, 235], thickness: number = 0.2) {
    this.checkPageBreak(thickness + 2);
    this.doc.setDrawColor(color[0], color[1], color[2]);
    this.doc.setLineWidth(thickness);
    this.doc.line(this.margin, this.y, 195, this.y);
    this.y += thickness + 3;
  }

  save(filename: string) {
    this.drawFooter();
    this.doc.save(filename);
  }
}

export function generateProgressReport(mocks: MockAttempt[], sessions: InterviewSession[]) {
  const builder = new PDFBuilder();

  // Draw Main Title & Header block
  builder.drawHeader();

  // Summary Metrics Section
  const avgScoreRaw = mocks.length
    ? mocks.reduce((sum, item) => sum + item.aiScore, 0) / mocks.length
    : 0;
  const avgScore = Math.round(avgScoreRaw * 10) / 10;
  builder.drawStatsDashboard(mocks.length, avgScore, sessions.length);

  // Focus Areas / Weaknesses summary (from sessions & mock feedback)
  const weakCounter: Record<string, number> = {};
  mocks.forEach((m) => {
    sessions.forEach((s) => {
      const matchedQ = s.questionBank.find((qb) => qb.question === m.question);
      if (matchedQ) {
        weakCounter[matchedQ.type] = (weakCounter[matchedQ.type] || 0) + 1;
      }
    });
  });

  const sortedFocusAreas = Object.entries(weakCounter)
    .sort((a, b) => a[1] - b[1])
    .map((entry) => `${entry[0].charAt(0).toUpperCase() + entry[0].slice(1)} (${entry[1]} attempts)`);

  if (sortedFocusAreas.length > 0) {
    builder.printText("Current Study Priorities:", 10, true, [17, 24, 39]);
    builder.y += 1;
    sortedFocusAreas.forEach((area) => {
      builder.printText(`•  ${area}`, 9, false, [75, 85, 99]);
    });
    builder.y += 4;
  }

  // Detailed History List
  builder.printSectionHeader("Mock Interview History");

  if (mocks.length === 0) {
    builder.printText("No mock interview attempts recorded yet.", 10, false, [107, 114, 128], true);
  } else {
    // Print mock attempts in reverse chronological order
    const sortedMocks = [...mocks].reverse();

    sortedMocks.forEach((mock, index) => {
      // Prevent orphan headers
      builder.checkPageBreak(40);

      // Question Title Block
      builder.doc.setFont("helvetica", "bold");
      builder.doc.setFontSize(10);
      builder.doc.setTextColor(31, 41, 55);
      builder.doc.text(`Attempt #${sortedMocks.length - index}`, builder.margin, builder.y);

      const dateStr = formatDate(mock.createdAt);
      builder.doc.setFont("helvetica", "normal");
      builder.doc.setFontSize(8);
      builder.doc.setTextColor(156, 163, 175);
      builder.doc.text(dateStr, 195 - builder.doc.getTextWidth(dateStr), builder.y);
      builder.y += 4.5;

      // Question Text
      builder.printKeyValue("Question: ", mock.question, 9.5, [107, 114, 128], [31, 41, 55]);

      // Score Banner
      builder.checkPageBreak(7);
      builder.doc.setFillColor(243, 244, 246); // light background
      builder.doc.roundedRect(builder.margin, builder.y, 180, 6, 1, 1, "F");

      builder.doc.setFont("helvetica", "bold");
      builder.doc.setFontSize(9);
      builder.doc.setTextColor(59, 130, 246); // Primary Color
      builder.doc.text(`AI Rating: ${mock.aiScore}/10`, builder.margin + 4, builder.y + 4.2);

      // Sentiment / Word Count metrics
      if (mock.aiFeedback.confidenceAnalysis) {
        const metrics = `Confidence: ${mock.aiFeedback.confidenceAnalysis.confidenceScore}/100  |  Sentiment: ${mock.aiFeedback.confidenceAnalysis.sentiment}  |  Words: ${mock.aiFeedback.confidenceAnalysis.wordCount}`;
        builder.doc.setFont("helvetica", "normal");
        builder.doc.setFontSize(8);
        builder.doc.setTextColor(107, 114, 128);
        builder.doc.text(metrics, 191 - builder.doc.getTextWidth(metrics), builder.y + 4.2);
      }
      builder.y += 9;

      // User Answer
      builder.printKeyValue("Your Answer: ", mock.userAnswer, 9, [107, 114, 128], [75, 85, 99]);

      // AI Verdict
      builder.printKeyValue("Verdict: ", mock.aiFeedback.oneLineVerdict, 9, [107, 114, 128], [31, 41, 55]);

      // Strengths & Missing lists
      builder.printBulletPoints("Key Strengths", mock.aiFeedback.strengths, [16, 185, 129]); // Green bullet
      builder.printBulletPoints("Areas to Improve", mock.aiFeedback.missing, [239, 68, 68]); // Red bullet

      // Model Answer
      if (mock.aiFeedback.modelAnswer) {
        builder.printKeyValue("Suggested Approach: ", mock.aiFeedback.modelAnswer, 8.5, [107, 114, 128], [107, 114, 128]);
      }

      // Add a line divider between attempts unless it's the last item
      if (index < sortedMocks.length - 1) {
        builder.y += 2;
        builder.drawHorizontalLine([243, 244, 246], 0.2);
        builder.y += 2;
      }
    });
  }

  // Save/Download file
  const reportDate = new Date().toISOString().slice(0, 10);
  builder.save(`PrepIQ_Progress_Report_${reportDate}.pdf`);
}
