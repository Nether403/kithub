Engineering Protocol: The kit.md Standard for High-Reliability Agentic Workflows

1. The Duality of the kit.md Architecture: Machine-Readable Logic and Human-Readable Instructions

The kit.md format represents the "npm for AI agents," a fundamental pivot from brittle, bespoke prompting to standardized, versioned units of work. In the agentic era, manual prompts fail to capture the specific environments, dependencies, and complex edge cases required for high-reliability execution. This protocol mandates the use of kit.md to ensure reproducibility across diverse agent environments. We require every kit to include the field schema: "kit/1.0"; any tooling encountered in this ecosystem must reject files lacking this exact string to prevent the proliferation of non-standardized, unreliable workflows.

The architectural power of this standard lies in the interplay between YAML frontmatter and the Markdown body. This duality allows agents to parse structured metadata for environment preparation while utilizing the Markdown narrative for cognitive grounding. The frontmatter establishes the machine-readable "What," while the Markdown sections provide the human-readable "Why" and "How."

The following table defines the mandatory mapping between core YAML fields and their corresponding Markdown sections. This alignment ensures that every technical specification is grounded in a descriptive narrative.

YAML Frontmatter Field	Corresponding Markdown Section	Engineering Logic
schema	## Setup	Enforces architectural versioning and environment validation.
model	## Setup	Defines the verified hosting requirements and reasoning baseline.
tools / skills	## Steps	Maps functional logic to the sequential execution of the workflow.
failures	## Failures Overcome	Provides inherited wisdom to bypass known trial-and-error loops.
requiredResources	## Constraints	Establishes strategic resource binding and organizational governance.

This structured foundation is the prerequisite for the next level of engineering: model-specific verification and rigorous dependency management.


--------------------------------------------------------------------------------


2. Model Verification and Dependency Management for Workflow Portability

Agentic reliability depends on "Absolute Grounding." We forbid the use of generic model family names (e.g., "Claude" or "GPT"). The protocol mandates specific identifiers—such as claude-sonnet-4-20250514 or gpt-5.4—to establish a "known-good" starting point for consuming agents. Furthermore, the hosting field within the model object is mandatory for publication. This field instructs the agent whether to look for an API key, install a local model server, or connect to a specific self-hosted endpoint, eliminating ambiguity during the initialization phase.

Reliability is further governed by the dependencies object and the selfContained flag:

* Runtime, NPM, and Secrets: These fields define the execution environment and required environment variables (e.g., ANTHROPIC_API_KEY). Secrets must identify the requirement without exposing raw keys.
* The selfContained Mandate: When selfContained: false is declared, the agent is commanded to stop and read the ## Setup and ## Constraints sections before taking any action. This prevents the "token-burning cycle" where an agent attempts to regenerate code or configure an environment from scratch when it actually requires an existing external codebase.

To prevent failed installations from consuming compute resources, we implement a strict preflight and verification protocol:

* Preflight Checks: Every entry in the preflightChecks array must include a check key containing a shell command (e.g., node --version). The agent must execute these commands sequentially. Any non-zero exit code must terminate execution immediately.
* Verification: A post-install command that confirms the workspace is healthy. In high-reliability kits, this command must verify that the environment is fully operational before the agent proceeds to the primary task.


--------------------------------------------------------------------------------


3. The Learnings Layer: Engineering for Token Efficiency and Error Recovery

The Learnings Layer transforms kit.md into a decentralized debugging network. Agents must not operate in isolation; they are required to inherit community wisdom to bypass expensive trial-and-error loops. We use the analogy of a "fully furnished house versus a pile of bricks": a standard script provides the materials, but a high-reliability kit provides the pre-solved environment.

This layer is engineered to optimize the Reliability-to-Cost ratio:

* Compounded Shared Experience: We mandate that any kit submitted for platform validation include the failures frontmatter field and the ## Failures Overcome narrative. Kits submitted without documented failure modes are considered "Sub-Standard" and will be rejected.
* Staggered Backoff Strategy: As a primary example of inherited wisdom, if an agent encounters a rate limit previously solved by the community, it must automatically implement the documented staggered backoff strategy rather than burning tokens on repetitive, failed retries.
* Local Adaptation Logs: Agents are encouraged to log adaptations to local environment conflicts—such as specific Node versioning gaps—back to the central registry, ensuring the workflow evolves based on real-world friction.

By enforcing the documentation of "Failures Overcome," we ensure that agents bypass the expense of rediscovering known roadblocks, moving directly to successful execution.


--------------------------------------------------------------------------------


4. Environmental Adaptation and Shared Contextual Bindings

Strategically separating solo local environments from enterprise scaling reduces the cognitive load on the agent. While a solo user may handle credentials via a local prompt, an enterprise environment requires "Shared Context" to manage credentials across multiple agents without risk of leakage.

The protocol manages this through environment.adaptationNotes and requiredResources:

* Adaptation Notes: This field provides concrete guidance for platform-specific modifications. For example: "For direct Telegram messages instead of group topics, remove the topic_id parameter from sendMessage calls."
* Resource Bindings and the op CLI: Shared resources (e.g., Supabase databases or Firecrawl APIs) are accessed via governance systems. We utilize 1Password vault references resolved with the op CLI to ensure the registry stores only the "instruction" and not the raw credential.

We define four specific Delivery Methods to maintain security and functionality:

* Connection: Used for live services like Supabase or Firecrawl.
* Copy: Used for moving local data into the agent's workspace.
* Inject / Mount: Direct provision of resources to the agent's runtime.

This architecture allows teams to fork public kits into private, organization-specific workflows, binding them to internal infrastructure while maintaining the integrity of the original logic.


--------------------------------------------------------------------------------


5. Standardized Bundle Layout and Implementation Protocols

High-reliability engineering requires "Agent-First" packaging. The human provides the architectural vision; the agent executes the formalized file structure. A gold-standard kit bundle follows a rigid layout consisting of the kit.md file, a src/ directory, and a fileManifest.

The fileManifest is a critical security and reliability control. It ensures the agent writes files to disk exactly as-is. We strictly forbid the agent from "regenerating code from prose," which is the primary source of logic drift and execution failure.

The Managed Hook Protocol

For kits containing managed hooks (specifically for OpenClaw environments), authors must adhere to a strict export protocol to avoid the pervasive "Handler is not a function" error.

* Mandate: module.exports = handler
* Logic: Exporting an object (e.g., module.exports = { handler }) is the most common cause of failure in OpenClaw loaders, which expect the function itself. CommonJS syntax must be used; ESM import/export in .js files will be rejected.

Conformance Levels

Every kit is graded against two conformance levels to ensure system-wide quality:

* Standard Level: Mandatory for all kits. Requires 6 sections: Goal, When to Use, Setup, Steps, Constraints, and Safety Notes. Must include non-empty tags and at least one documented failure.
* Full Level: The benchmark for high-reliability. Requires all Standard elements plus a src/ directory, a complete fileManifest, and a functional verification command. A kit without a verification command cannot be classified as High-Reliability.

A properly engineered kit is not a static script, but a living, adoptable workflow. It is designed so that an agent can move from "what are these files?" to "look at all the pain and expense I just bypassed."
