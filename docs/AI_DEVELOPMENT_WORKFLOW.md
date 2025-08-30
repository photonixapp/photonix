# AI-Assisted Development Workflow for Photonix

This document outlines a standardized workflow for developing the Photonix project using one or more AI assistants. Adhering to this process is mandatory for all contributors to ensure consistency, quality, and maintainability.

## Phase 1: Task Definition and Planning

This phase is typically performed by a "Lead Assistant" or in collaboration with the human project manager.

1.  **High-Level Goal Definition**: The human project manager defines a high-level goal (e.g., "Implement Phase 1 of the refactor plan," "Add video support").
2.  **Detailed Plan Creation**: An AI assistant takes the goal and creates a detailed, step-by-step implementation plan. This plan should be a new markdown document in the `docs/planning/` directory. It must break the goal into small, well-defined, and testable tasks. The `PHASE_1_IMPLEMENTATION_PLAN.md` is a perfect example of such a document.
3.  **Plan Approval**: The human project manager reviews and approves this detailed plan before any implementation work begins.

## Phase 2: Task Execution

This phase is performed by any available AI assistant on a single, assigned task.

1.  **Task Assignment**: The human project manager assigns one specific, small task from the approved plan to an assistant (e.g., "Implement Task 1.2: Migrate RAW Processing to a Celery Task").
2.  **Pre-computation Checklist (Mandatory)**: Before writing any code, the assigned assistant **must** perform and acknowledge the following steps:
    *   Read the `AGENTS.md` file (once it's created) to get the project overview.
    *   Read and confirm understanding of all documents in `docs/guidelines/` (`CODING_GUIDELINES.md`, `DESIGN_PRINCIPLES.md`, `UI_UX_GUIDELINES.md`).
    *   Read the `TESTING_STRATEGY.md` document.
    *   State its understanding of the specific task assigned and the acceptance criteria.
3.  **Implementation**: The assistant writes the code to complete the task, strictly adhering to all project guidelines.
4.  **Testing**:
    *   The assistant **must** run the entire existing test suite (`make test`) to ensure no regressions have been introduced.
    *   If the task adds new functionality, the assistant **must** also add new unit or integration tests to cover the new code, as per the testing strategy.
5.  **Code Review**: The assistant **must** run the `request_code_review()` tool to get automated feedback on the changes. Any issues must be addressed.
6.  **Submission**: Once all tests pass and the code review is clean, the assistant uses the `submit()` tool to create a pull request. The PR description must be detailed and link back to the task definition in the planning document.

## Phase 3: Review and Merge

This phase is primarily handled by the human project manager.

1.  **Human Review**: The project manager reviews the pull request for correctness and adherence to the project's goals.
2.  **Feedback Loop**: If changes are required, the project manager provides feedback via PR comments. The original AI assistant is responsible for addressing the feedback and updating the pull request.
3.  **Merge**: Once the pull request is approved, the project manager merges it into the main branch.

By following this structured workflow, we can ensure that all assistants, present and future, contribute to the project in a coordinated and high-quality manner.
