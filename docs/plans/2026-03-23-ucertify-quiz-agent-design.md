# uCertify Quiz Agent Design

## Goal

Build a fully autonomous browser-side agent for uCertify review pages that extracts every quiz question and its correct answer, advances through the quiz automatically, stops at the end, and downloads the collected data as JSON.

## Scope

The first version is optimized for `https://www.ucertify.com/` review-mode quiz pages. It should run directly in the browser console and be structured so the same core logic can be reused in a browser extension content script later.

## DOM Strategy

The uCertify markup provides stable anchors:

- Root container: `#uc-item-test-template`
- Question text: `[navid="question"] .global_ques`
- Answer list: `#item_answer label.option`
- Explanation: `#item_explanation .explanation_content`
- Item identity: `#content_guid` or `uc_item_content_guid`
- Review-mode correctness markers:
  - `.icomoon-correct`
  - checked `input`
  - active answer input wrapper
  - explanation text such as `Answer D is correct`

The agent will prefer explicit correctness markers on the selected option, then fall back to explanation parsing if needed.

## Data Model

Each saved record will place the primary fields first:

```json
{
  "question": "...",
  "answers": ["..."],
  "answerLetters": ["D"],
  "options": [{ "letter": "A", "text": "..." }],
  "explanation": "...",
  "contentGuid": "07Siv",
  "progress": { "current": 4, "total": 18 },
  "timestamp": "2026-03-23T00:00:00.000Z"
}
```

Duplicates will be prevented by keying records on `contentGuid` when available, with normalized question text as a fallback.

## Runtime Flow

1. Detect that the current page matches the expected uCertify quiz structure.
2. Extract the current question, options, correct answers, explanation, and progress.
3. Save the record only if it is new.
4. Click the next button.
5. Wait for a question change using `MutationObserver`, with a timeout fallback.
6. Stop when progress reaches the total or when the next button is unavailable.
7. Download the results as JSON.

## Robustness

- Normalize whitespace to avoid duplicate noise.
- Support single-answer and multi-answer questions.
- Use multiple progress sources:
  - explicit `"4 of 18"` text
  - `itemSequence` / `total_item` globals when present
- Guard against infinite loops by detecting when the question identity does not change after navigation.
- Stop cleanly and preserve partial results if the page becomes non-responsive.

## Testing Approach

The standalone project will use test-first development for the core extraction and orchestration logic. Since the runtime target is the browser, tests will mock the small DOM surface used by the agent:

- explanation parsing
- correct-option detection
- deduplication
- progress parsing
- final-record field ordering and structure

## Non-Goals

- Bypassing hidden answers when the page is not in review mode
- Using AI APIs
- Supporting unrelated quiz platforms in the first release
