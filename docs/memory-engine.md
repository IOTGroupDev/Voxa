# Memory Engine

Voxa is a continuity memory system, not a chatbot. The memory engine turns captured voice events into long-term semantic continuity.

## Responsibilities

`backend/src/ai/memory.service.ts` is the MVP home for memory-engine orchestration:

- normalize transcript text;
- prepare summaries and tags through provider interfaces;
- classify Memory Events;
- find similar memories;
- attach events to Memory Threads;
- update thread statistics;
- decide whether an Insight is worth generating.

## Memory Threads

Memory Threads track recurring semantic themes over time. A thread records first appearance, latest activity, frequency, unresolved count, importance, emotional trend, and semantic cluster identity.

Threads must not feel like projects, boards, or productivity buckets. They are quiet continuity signals.

## Insights

Insights are rare. They should appear only when the system detects a meaningful pattern:

- recurring theme;
- unresolved question;
- similar past note;
- project direction;
- emotional pattern;
- forgotten task;
- decision needed.

The default behavior is silence. The system should only speak when a resurfacing is likely to be useful.

