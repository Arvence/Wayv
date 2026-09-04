# Notes

## Setup

See `README.md` for the full setup instructions.

The project uses PostgreSQL through Docker Compose for local development. The setup includes installing dependencies, creating the local `.env` file, starting PostgreSQL, running Drizzle migrations, seeding development data, and starting the application.

## Concurrency and budget safety

Campaign approvals are handled inside a PostgreSQL transaction.

The campaign row is locked with `FOR UPDATE`, then the submission state and current campaign budget usage are rechecked after the lock is acquired. Approvals are first come, first served, so two concurrent approvals cannot both consume the same remaining budget.

Budget safety is also preserved after approval. Metric growth during ingestion is checked against the campaign budget, and financial campaign edits cannot make existing approved payouts exceed `totalBudget`.

Alternatives considered:

- In-memory mutex: not safe across multiple application instances or processes.
- `SERIALIZABLE` isolation: valid, but heavier than necessary for this scope and would require broader retry handling.
- PostgreSQL advisory locks: also valid, but less direct than locking the campaign row being protected.

## Deliberate omissions

The following were intentionally left outside the scope of the assignment:

- Real authentication provider
- Payment provider or paid-workflow UI
- Advanced URL canonicalization
- Automatic campaign lifecycle based on start and end dates
- Additional analytics beyond the required campaign overview

The focus was kept on the required business flow, correctness, authorization, payouts, metrics, and budget safety.

## With another day

I would add a larger end-to-end integration test covering the complete flow:

creator submission → admin review → approval → metric ingestion → updated creator earnings and campaign budget.

## AI usage

I used ChatGPT, GitHub Copilot, and Codex during the project for:

- Research and exploring implementation options
- Architecture and design discussions
- Generating and editing application code
- Debugging
- UI implementation and iteration
- Writing and improving tests
- Reviewing database and concurrency logic
- Requirement analysis and final auditing

AI-generated output was manually reviewed and corrected when necessary.

Examples of corrections:

- `Total Approved Views` initially summed historical metric snapshots instead of using only the latest metric for each approved submission.
- The first trend implementation compared unrelated daily chart values and produced misleading percentages.
- The initial approval-only budget protection did not account for payout increases caused by later metric growth.
- Initial URL validation only checked whether the input was a generic valid URL instead of validating platform-specific post URLs.