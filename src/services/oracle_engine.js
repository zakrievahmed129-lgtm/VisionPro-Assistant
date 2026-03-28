/**
 * AETHER-OS — Oracle Infinity Engine
 * Persistent Reasoning Module with Plan-Act-Observe-Reflect (PAOR) Loop
 * and Phoenix Protocol for Stateful Handoff across Rate Limits.
 *
 * @module OracleEngine
 * @version 1.0.0
 */

class OracleEngine {
    constructor() {
        this.isActive = false;
        this.session = null;
        this.listeners = { step: [], complete: [], error: [] };
    }

    /** Subscribe to reasoning events */
    on(event, fn) { (this.listeners[event] = this.listeners[event] || []).push(fn); }
    emit(event, data) { (this.listeners[event] || []).forEach(fn => fn(data)); }

    /**
     * Creates a fresh Oracle reasoning session.
     * This is the "consciousness snapshot" that survives 429 handoffs.
     */
    createSession(userPrompt) {
        this.session = {
            id: `oracle_${Date.now()}`,
            originalPrompt: userPrompt,
            goalGraph: [],       // Decomposed sub-tasks
            thoughtLog: [],      // Reasoning trace
            workingMemory: {},   // Extracted variables/data
            currentPhase: 'PLAN',
            startTime: Date.now(),
            completedSteps: 0,
            totalSteps: 0
        };
        return this.session;
    }

    /**
     * PHOENIX PROTOCOL — Serialize the entire reasoning state
     * into a "Prime Prompt" for seamless key handoff.
     */
    serializeState() {
        if (!this.session) return '';
        const s = this.session;
        let prime = `[ORACLE PHOENIX PROTOCOL — STATE RESTORATION]\n`;
        prime += `Original Query: ${s.originalPrompt}\n`;
        prime += `Phase: ${s.currentPhase}\n`;

        if (s.goalGraph.length > 0) {
            prime += `\nGoal Graph (${s.completedSteps}/${s.totalSteps} complete):\n`;
            s.goalGraph.forEach((g, i) => {
                const status = g.done ? '✅' : (g.active ? '🔄' : '⬚');
                prime += `  ${status} ${i + 1}. ${g.label}\n`;
                if (g.result) prime += `     Result: ${g.result.slice(0, 200)}\n`;
            });
        }

        if (s.thoughtLog.length > 0) {
            prime += `\nReasoning Trace:\n`;
            s.thoughtLog.forEach(t => { prime += `  [${t.phase}] ${t.thought}\n`; });
        }

        if (Object.keys(s.workingMemory).length > 0) {
            prime += `\nWorking Memory:\n${JSON.stringify(s.workingMemory, null, 2)}\n`;
        }

        prime += `\n[RESUME REASONING FROM PHASE: ${s.currentPhase}]`;
        return prime;
    }

    /**
     * Builds the PLAN phase prompt.
     * Instructs the LLM to decompose the query into a numbered goal graph.
     */
    buildPlanPrompt(systemPrompt, userPrompt) {
        return `${systemPrompt}

### ORACLE MODE: DEEP REASONING ACTIVE ###
You are in Oracle Mode. Decompose this complex request into a numbered plan of 2-5 concrete sub-tasks.
Output ONLY a JSON array of strings, each string being one step. No explanation, no markdown.
Example: ["Step 1 description", "Step 2 description"]

User Request: ${userPrompt}`;
    }

    /**
     * Builds the ACT phase prompt for a specific sub-task.
     */
    buildActPrompt(systemPrompt, step, contextSoFar) {
        let prompt = `${systemPrompt}\n\n### ORACLE MODE: EXECUTING SUB-TASK ###\n`;
        if (contextSoFar) prompt += `Previous findings:\n${contextSoFar}\n\n`;
        prompt += `Current sub-task: ${step}\n\nExecute this sub-task. Use tools if needed. Be thorough but concise.`;
        return prompt;
    }

    /**
     * Builds the REFLECT phase prompt for self-critique.
     */
    buildReflectPrompt(systemPrompt, originalPrompt, allResults) {
        return `${systemPrompt}

### ORACLE MODE: SELF-CRITIQUE & SYNTHESIS ###
Original question: ${originalPrompt}

Research findings:
${allResults}

Instructions:
1. Critically evaluate each finding for accuracy and relevance.
2. Identify any contradictions or gaps.
3. Synthesize a comprehensive, authoritative final answer.
4. If any finding seems hallucinated or unsupported, discard it.

Deliver the final, polished response to the user.`;
    }

    /**
     * Logs a reasoning step and emits it to the UI.
     */
    logThought(phase, thought) {
        if (!this.session) return;
        const entry = { phase, thought, timestamp: Date.now() };
        this.session.thoughtLog.push(entry);
        this.emit('step', {
            phase,
            thought,
            progress: this.session.totalSteps > 0
                ? this.session.completedSteps / this.session.totalSteps
                : 0,
            goalGraph: [...this.session.goalGraph]
        });
    }

    /**
     * Marks a goal step as complete.
     */
    completeGoal(index, result) {
        if (!this.session || !this.session.goalGraph[index]) return;
        this.session.goalGraph[index].done = true;
        this.session.goalGraph[index].active = false;
        this.session.goalGraph[index].result = result;
        this.session.completedSteps++;
    }

    /**
     * Marks a goal step as active (currently being worked on).
     */
    activateGoal(index) {
        if (!this.session || !this.session.goalGraph[index]) return;
        this.session.goalGraph.forEach(g => g.active = false);
        this.session.goalGraph[index].active = true;
    }
}

// Global singleton
window.OracleEngine = new OracleEngine();
console.log('🔮 [OracleEngine] Oracle Infinity Engine initialized.');
