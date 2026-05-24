import { describe, expect, it, vi } from "vitest";
import { generateProgressReport } from "./pdfGenerator";
import type { MockAttempt, InterviewSession } from "./store";

// Mock jsPDF
const mockSave = vi.fn();
const mockText = vi.fn();
const mockLine = vi.fn();
const mockRect = vi.fn();
const mockCircle = vi.fn();
const mockRoundedRect = vi.fn();
const mockAddPage = vi.fn();

vi.mock("jspdf", () => {
  return {
    jsPDF: vi.fn().mockImplementation(() => {
      return {
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        setTextColor: vi.fn(),
        setFillColor: vi.fn(),
        setDrawColor: vi.fn(),
        setLineWidth: vi.fn(),
        getTextWidth: vi.fn().mockReturnValue(10),
        splitTextToSize: vi.fn().mockImplementation((text) => [text]),
        text: mockText,
        line: mockLine,
        rect: mockRect,
        circle: mockCircle,
        roundedRect: mockRoundedRect,
        addPage: mockAddPage,
        save: mockSave,
        internal: {
          pageSize: {
            height: 297,
            width: 210,
          },
        },
      };
    }),
  };
});

describe("generateProgressReport", () => {
  const sampleMocks: MockAttempt[] = [
    {
      id: "mock-1",
      sessionId: "session-1",
      userId: "user-1",
      question: "What are React hooks?",
      userAnswer: "React hooks allow you to use state in functional components.",
      aiScore: 8,
      aiFeedback: {
        strengths: ["Clear response", "Good explanation"],
        missing: ["Explain lifecycle methods relations"],
        modelAnswer: "A complete answer covers useState, useEffect, etc.",
        oneLineVerdict: "Excellent answer with minor omissions.",
        confidenceAnalysis: {
          confidenceScore: 85,
          sentiment: "positive",
          specificity: 60,
          wordCount: 10,
        },
      },
      createdAt: "2026-05-24T12:00:00Z",
    },
  ];

  const sampleSessions: InterviewSession[] = [
    {
      id: "session-1",
      userId: "user-1",
      jobTitle: "Frontend Developer",
      company: "Google",
      jdText: "Develop web apps.",
      resumeText: "React developer.",
      gapAnalysis: [],
      readinessScore: 75,
      questionBank: [
        {
          question: "What are React hooks?",
          type: "technical",
          difficulty: "medium",
          tip: "Cover hooks hooks hooks",
        },
      ],
      roadmap: [],
      extractedSkills: [],
      mlMatchScore: 80,
      createdAt: "2026-05-24T10:00:00Z",
    },
  ];

  it("compiles the PDF and triggers save with correct filename", () => {
    mockSave.mockClear();
    mockText.mockClear();

    generateProgressReport(sampleMocks, sampleSessions);

    // Verify it triggers save
    expect(mockSave).toHaveBeenCalled();
    const saveCallArg = mockSave.mock.calls[0][0];
    expect(saveCallArg).toContain("PrepIQ_Progress_Report_");
    expect(saveCallArg).toContain(".pdf");

    // Verify header title is written
    const textCalls = mockText.mock.calls.map((call) => call[0]);
    expect(textCalls).toContain("PrepIQ Progress Report");

    // Verify mock interview details are written
    expect(textCalls).toContain("What are React hooks?");
    expect(textCalls).toContain("React hooks allow you to use state in functional components.");
    expect(textCalls).toContain("AI Rating: 8/10");
  });
});
