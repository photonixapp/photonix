# Photonix Project Guide for AI Assistants

Welcome to the Photonix project! This document is the starting point for any AI assistant contributing to this codebase.

## Project Goal

The primary goal of this project is to refactor and enhance the Photonix photo management application. The key objectives are to improve its **performance**, **reliability**, and **scalability**, while also adding new features and ensuring the project is maintainable for the long term.

## Mandatory Reading

Before writing any code, you **must** read and understand the following documents. They provide the necessary context, rules, and plans for this project.

### 1. Understand the "Why": The Problem and the Plan

Start here to understand the strategic context of your work.

*   **`./docs/analysis/PHOTONIX_TECH_DEBT_AND_PERFORMANCE.md`**: Explains the core performance and reliability issues with the original codebase. **This is the most important document for understanding *why* we are refactoring.**
*   **`./docs/planning/PHOTONIX_REFACTOR_PLAN.md`**: Outlines the high-level, three-phase strategy for improving the application.
*   **`./docs/planning/PHASE_1_IMPLEMENTATION_PLAN.md`**: Provides a detailed, actionable checklist for the current refactoring phase. Your assigned task will be from this document.

### 2. Understand the "How": The Rules of the Road

You must follow these guidelines to ensure your contributions are consistent with the project's standards.

*   **`./docs/guidelines/DESIGN_PRINCIPLES.md`**: The architectural rules. You **must** adhere to these (e.g., using Celery for background tasks).
*   **`./docs/guidelines/CODING_GUIDELINES.md`**: The code style guide for Python and React, and the format for Git commit messages.
*   **`./docs/guidelines/UI_UX_GUIDELINES.md`**: The rules for building consistent and high-quality user interfaces with Chakra UI.
*   **`./docs/TESTING_STRATEGY.md`**: The plan for writing unit, integration, and end-to-end tests. You are required to add tests for new functionality.

### 3. Understand the "What": The System Itself

Refer to these documents for details about the existing system.

*   **`./docs/analysis/PHOTONIX_ARCHITECTURE.md`**: A high-level overview of the system's components.
*   **`./docs/analysis/PHOTONIX_CODE_FLOW.md`**: A detailed trace of the photo processing pipeline.
*   **`./docs/analysis/PHOTONIX_DATABASE_SCHEMA.md`**: The structure of the PostgreSQL database.
*   **`./docs/analysis/PHOTONIX_TECHNOLOGY_STACK.md`**: A list of all technologies and libraries used.

## Your Workflow

Your development process must follow the steps outlined in:
*   **`./docs/AI_DEVELOPMENT_WORKFLOW.md`**

This includes running all tests and using the `request_code_review()` tool before submitting your work. Thank you for your contribution!
