# Open WebUI Company Categories Design

**Date:** 2026-03-18

**Goal:** Add company-based categorization for the Featherless-backed model catalog in Open WebUI, and when a company category is selected, show the highest-priority models first using a curated popularity proxy.

## Context

The current Open WebUI setup is backed by Featherless through the OpenAI-compatible API. Featherless returns a large catalog of models with basic metadata such as `id`, `owned_by`, `model_class`, and `created`, but it does not provide download counts or a direct popularity field.

Because "most downloaded" is not available from the provider, the behavior will use a curated ranking proxy.

## Approved Design

### Company Categorization

- Derive `company` from the model ID prefix before the first `/`.
- Examples:
  - `deepseek-ai/DeepSeek-V3.2` -> `deepseek-ai`
  - `Qwen/Qwen3.5-27B` -> `Qwen`
  - `google/gemma-7b` -> `google`
- If a model ID has no `/`, fall back to `owned_by`.

### Sorting Rule

- Add a curated popularity ranking map for known company/model families.
- When a company filter is active, sort matching models by:
  1. Curated popularity rank
  2. Model name
- If no curated rank exists, fall back to alphabetical sorting.

### UI Behavior

- Reuse existing model metadata and filtering hooks where possible.
- Expose a company category derived from the normalized company value.
- Ensure the selected company category shows its highest-priority models first.
- Preserve normal model switching behavior.

### Data Shape

Each returned model should be enriched with:

- `company`
- `company_normalized`
- `popularity_rank`
- `tags` entry like `company:deepseek-ai`

### Fallback for deepseek-chat

- Keep the existing custom alias `deepseek-chat` -> `deepseek-ai/DeepSeek-V3.2`.
- Ensure alias models inherit company and ranking from their base model where possible.

## Error Handling

- If a model ID cannot be parsed, assign company from `owned_by`.
- If a company has no curated ranking, use alphabetical ordering.
- If custom alias models reference a missing base model, preserve current Open WebUI fallback behavior.

## Verification

- Confirm `/api/models` includes company metadata and company tags.
- Confirm `deepseek-chat` remains visible and selectable.
- Confirm filtering to `company:deepseek-ai` places `deepseek-chat` or the mapped DeepSeek priority model first.
- Confirm model switching still works after filtering.
